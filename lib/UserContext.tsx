"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

// User type with all optional fields
interface User {
  name?: string;
  email?: string;
  image?: string;
}

// Context type
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  getUser: () => User | null;
}

// Create the context
const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  getUser: () => null,
});

// Provider component
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const getUser = () => user;

  return (
    <UserContext.Provider value={{ user, setUser, getUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook
export const useUser = () => useContext(UserContext);