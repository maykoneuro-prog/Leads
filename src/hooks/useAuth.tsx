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
        try {
          const roleDoc = await getDoc(doc(db, 'userRoles', u.uid));
          const adminEmails = ['maykon.euro@gmail.com', 'administrador@sesipe.com.br'];
          const userEmail = u.email?.toLowerCase() || '';
          
          if (roleDoc.exists()) {
            const data = roleDoc.data() as UserRoleRecord;
            // Force Admin if email is in the master list, even if record exists
            if (adminEmails.includes(userEmail)) {
              setRoleData({ ...data, role: 'Admin' });
            } else {
              setRoleData(data);
            }
          } else {
            // Auto-promote specific email to Admin if record missing
            if (adminEmails.includes(userEmail)) {
              const defaultAdmin: UserRoleRecord = {
                uid: u.uid,
                email: u.email || '',
                role: 'Admin',
                name: 'Administrador Principal'
              };
              setRoleData(defaultAdmin);
            } else {
              setRoleData(null);
            }
          }
        } catch (error) {
          console.error("Error fetching role data:", error);
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
