import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRoleRecord } from '../types';

interface AuthContextType {
  user: User | null;
  roleData: UserRoleRecord | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, roleData: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roleData, setRoleData] = useState<UserRoleRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const roleDoc = await getDoc(doc(db, 'userRoles', u.uid));
        if (roleDoc.exists()) {
          setRoleData(roleDoc.data() as UserRoleRecord);
        } else {
          setRoleData(null);
        }
      } else {
        setRoleData(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, roleData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
