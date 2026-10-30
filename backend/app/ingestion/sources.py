import logging
import os
import stat
import tempfile
import urllib.parse
import zipfile
from typing import Optional, Tuple
import httpx

logger = logging.getLogger(__name__)

DEFAULT_MAX_ZIP_BYTES = 52428800           # 50 MB
DEFAULT_MAX_UNCOMPRESSED_BYTES = 209715200  # 200 MB
DEFAULT_MAX_FILES = 2000

def get_limits() -> Tuple[int, int, int]:
    try:
        max_zip = int(os.getenv("MAX_ZIP_BYTES", str(DEFAULT_MAX_ZIP_BYTES)))
    except ValueError:
        max_zip = DEFAULT_MAX_ZIP_BYTES
    try:
        max_uncompressed = int(os.getenv("MAX_UNCOMPRESSED_BYTES", str(DEFAULT_MAX_UNCOMPRESSED_BYTES)))
    except ValueError:
        max_uncompressed = DEFAULT_MAX_UNCOMPRESSED_BYTES
    try:
        max_files = int(os.getenv("MAX_FILES", str(DEFAULT_MAX_FILES)))
    except ValueError:
        max_files = DEFAULT_MAX_FILES
    return max_zip, max_uncompressed, max_files

def extract_zip_safely(zip_path: str, dest_dir: str) -> str:
    """
    Safely extract a zip archive to dest_dir with protections against:
    - Zip-slip (directory traversal / absolute paths / '..' segments)
    - Symlinks
    - Oversized archives (> MAX_ZIP_BYTES)
    - Zip bombs (> MAX_UNCOMPRESSED_BYTES)
    - Excessive file counts (> MAX_FILES * 3)

    Returns the root directory of the extracted repository. If the archive
    contains a single top-level directory, that directory is returned.
    """
    if not os.path.exists(zip_path):
        raise ValueError(f"ZIP file does not exist: {zip_path}")
    if not os.path.isfile(zip_path):
        raise ValueError(f"ZIP path is not a file: {zip_path}")

    max_zip_bytes, max_uncompressed_bytes, max_files = get_limits()
    max_members = max_files * 3

    actual_zip_size = os.path.getsize(zip_path)
    if actual_zip_size > max_zip_bytes:
        raise ValueError(f"ZIP exceeds {max_zip_bytes} bytes (got {actual_zip_size})")

    try:
        zf = zipfile.ZipFile(zip_path, "r")
    except zipfile.BadZipFile as e:
        raise ValueError(f"Invalid ZIP archive: {e}") from e

    with zf:
        infolist = zf.infolist()
        if len(infolist) > max_members:
            raise ValueError(
                f"ZIP contains too many entries: {len(infolist)} (maximum allowed is {max_members})"
            )

        declared_uncompressed = sum(info.file_size for info in infolist)
        if declared_uncompressed > max_uncompressed_bytes:
            raise ValueError(
                f"Uncompressed size exceeds {max_uncompressed_bytes} bytes (got {declared_uncompressed})"
            )

        dest_dir_abs = os.path.abspath(dest_dir)

        # First pass: validate all entries for safety
        for info in infolist:
            # Check for symlink in external_attr (Unix mode in top 16 bits)
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError(f"Symlinks are not allowed in ZIP archive: {info.filename}")

            raw_name = info.filename.replace("\\", "/")
            if raw_name.startswith("/") or os.path.isabs(info.filename):
                raise ValueError(f"Zip-slip detected (absolute path): {info.filename}")

            parts = [p for p in raw_name.split("/") if p]
            if any(p == ".." for p in parts):
                raise ValueError(f"Zip-slip detected ('..' traversal): {info.filename}")

            target_path = os.path.abspath(os.path.join(dest_dir, *parts))
            if not (target_path == dest_dir_abs or target_path.startswith(dest_dir_abs + os.sep)):
                raise ValueError(f"Zip-slip detected (destination escape): {info.filename}")

        # Second pass: extract files while enforcing uncompressed size limit
        extracted_bytes = 0
        for info in infolist:
            parts = [p for p in info.filename.replace("\\", "/").split("/") if p]
            if not parts:
                continue

            target_path = os.path.join(dest_dir, *parts)
            if info.is_dir():
                os.makedirs(target_path, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                with zf.open(info, "r") as src, open(target_path, "wb") as dst:
                    while True:
                        buf = src.read(65536)
                        if not buf:
                            break
                        extracted_bytes += len(buf)
                        if extracted_bytes > max_uncompressed_bytes:
                            raise ValueError(
                                f"Uncompressed size exceeds {max_uncompressed_bytes} bytes during extraction"
                            )
                        dst.write(buf)

    # Check if there is a single top-level directory
    entries = [e for e in os.listdir(dest_dir) if not e.startswith(".")]
    if len(entries) == 1:
        single_path = os.path.join(dest_dir, entries[0])
        if os.path.isdir(single_path):
            return single_path

    # If all entries include hidden files but there's only one directory
    all_entries = os.listdir(dest_dir)
    if len(all_entries) == 1:
        single_path = os.path.join(dest_dir, all_entries[0])
        if os.path.isdir(single_path):
            return single_path

    return dest_dir

def parse_github_url(url: str) -> Tuple[str, str, Optional[str]]:
    """
    Parse a GitHub repository URL into (owner, repo, branch).
    Accepts:
      https://github.com/owner/repo
      https://github.com/owner/repo.git
      https://github.com/owner/repo/
      https://github.com/owner/repo/tree/branch-name
      https://github.com/owner/repo/tree/feature/sub-branch

    Rejects non-github.com hosts and malformed URLs with ValueError.
    """
    if not url or not isinstance(url, str):
        raise ValueError("GitHub URL must be a non-empty string")

    raw_url = url.strip()
    if not raw_url.startswith(("http://", "https://")):
        # Allow github.com/owner/repo without scheme
        if raw_url.startswith("github.com/"):
            raw_url = "https://" + raw_url
        else:
            raise ValueError(f"Invalid GitHub URL: {url}")

    try:
        parsed = urllib.parse.urlparse(raw_url)
    except Exception as e:
        raise ValueError(f"Malformed URL: {url}") from e

    host = (parsed.netloc or "").lower().split(":")[0]
    if host not in ("github.com", "www.github.com"):
        raise ValueError(f"Invalid host '{host}'. Only github.com is supported.")

    path_parts = [p for p in parsed.path.split("/") if p]
    if len(path_parts) < 2:
        raise ValueError(f"Invalid GitHub repository URL path: {url}")

    owner = path_parts[0]
    repo = path_parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]

    if not owner or not repo:
        raise ValueError(f"Could not extract owner and repo from URL: {url}")

    branch: Optional[str] = None
    if len(path_parts) >= 4 and path_parts[2] == "tree":
        branch = "/".join(path_parts[3:])
        # Strip trailing slash if present
        if branch.endswith("/"):
            branch = branch[:-1]

    return owner, repo, branch

def download_github_zip(owner: str, repo: str, branch: Optional[str], dest_zip_path: str) -> None:
    """
    Download repository archive as zip from GitHub.
    Uses httpx with 30s timeout, follows redirects, and enforces MAX_ZIP_BYTES.
    Honors optional GITHUB_TOKEN environment variable. Never logs the token.
    Raises ValueError for 404 (not found or private),
    and RuntimeError for 403/429/network errors.
    """
    max_zip_bytes, _, _ = get_limits()

    headers = {
        "User-Agent": "RepoLens-Ingestion/1.0",
        "Accept": "application/vnd.github.v3+json",
    }
    token = os.getenv("GITHUB_TOKEN")
    if token and token.strip():
        headers["Authorization"] = f"Bearer {token.strip()}"

    timeout = httpx.Timeout(30.0, connect=10.0)

    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        # Determine branch if not specified
        if branch is None:
            api_url = f"https://api.github.com/repos/{owner}/{repo}"
            try:
                resp = client.get(api_url, headers=headers)
                if resp.status_code == 404:
                    raise ValueError("Repository not found or is private")
                elif resp.status_code == 200:
                    data = resp.json()
                    branch = data.get("default_branch")
                elif resp.status_code in (403, 429):
                    logger.warning("GitHub API rate limit or forbidden, falling back to main/master")
                else:
                    logger.warning("GitHub API returned %d, falling back to main/master", resp.status_code)
            except httpx.RequestError as e:
                logger.warning("GitHub API request error (%s), falling back to main/master", e)

        branches_to_try = [branch] if branch else ["main", "master"]

        download_success = False
        last_error: Optional[Exception] = None

        for candidate_branch in branches_to_try:
            codeload_url = f"https://codeload.github.com/{owner}/{repo}/zip/refs/heads/{candidate_branch}"
            try:
                with client.stream("GET", codeload_url, headers=headers) as resp:
                    if resp.status_code == 404:
                        last_error = ValueError("Repository not found or is private")
                        continue
                    if resp.status_code in (403, 429):
                        raise RuntimeError(f"GitHub rate limit or forbidden (HTTP {resp.status_code})")
                    if resp.status_code >= 400:
                        raise RuntimeError(f"GitHub returned HTTP {resp.status_code} when downloading archive")

                    total_downloaded = 0
                    os.makedirs(os.path.dirname(os.path.abspath(dest_zip_path)), exist_ok=True)
                    with open(dest_zip_path, "wb") as f_out:
                        for chunk in resp.iter_bytes(chunk_size=65536):
                            total_downloaded += len(chunk)
                            if total_downloaded > max_zip_bytes:
                                raise ValueError(f"ZIP exceeds {max_zip_bytes} bytes")
                            f_out.write(chunk)

                    download_success = True
                    break
            except httpx.RequestError as e:
                raise RuntimeError(f"Network error while downloading from GitHub: {e}") from e

        if not download_success:
            if last_error:
                raise last_error
            raise ValueError("Repository not found or is private")
