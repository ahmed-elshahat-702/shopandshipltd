/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserProvider, useUser } from './use-auth';
import React from 'react';

// Component to consume the hook for testing
const TestComponent = () => {
  const { user, loading } = useUser();
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No User</div>;
  return <div>{user.email} - {user.role}</div>;
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with initialUser', () => {
    const initialUser = {
      id: '1',
      email: 'test@example.com',
      role: 'merchant',
      fullName: 'Test Merchant',
      emailVerified: true,
    };

    render(
      <UserProvider initialUser={initialUser}>
        <TestComponent />
      </UserProvider>
    );

    expect(screen.getByText('test@example.com - merchant')).toBeInTheDocument();
  });

  it('should show loading state when initialUser is null', () => {
    render(
      <UserProvider initialUser={null}>
        <TestComponent />
      </UserProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should update state when initialUser changes (server re-render sync)', () => {
    const { rerender } = render(
      <UserProvider initialUser={null}>
        <TestComponent />
      </UserProvider>
    );

    const updatedUser = {
      id: '2',
      email: 'updated@example.com',
      role: 'admin',
    };

    rerender(
      <UserProvider initialUser={updatedUser}>
        <TestComponent />
      </UserProvider>
    );

    expect(screen.getByText('updated@example.com - admin')).toBeInTheDocument();
  });
});
