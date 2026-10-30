import React, { useState } from 'react';

interface Props {
  initialCount?: number;
}

export const App = ({ initialCount = 0 }: Props) => {
  const [count, setCount] = useState(initialCount);

  const increment = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <h1>Counter: {count}</h1>
      <button onClick={increment}>Increment</button>
    </div>
  );
};

export class SessionStore {
  private active: boolean = false;

  constructor(token: string) {
    if (token) this.active = true;
  }

  isValid(): boolean {
    return this.active;
  }
}

export async function fetchSessionAsync(token: string): Promise<boolean> {
  const store = new SessionStore(token);
  return store.isValid();
}

export default App;
