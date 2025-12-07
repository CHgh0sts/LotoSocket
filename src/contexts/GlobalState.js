"use client"
import { createContext, useState } from 'react';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [me, setMe] = useState(null);
  const [partyInfos, setPartyInfos] = useState({
    id: 1,
    me: me,
    gameType: '1Ligne',
    deleteNumbers: true,
    numbers: [],
    listUsers: [],
    listCartons: []
  });
  
  return (
    <GlobalContext.Provider value={{
      partyInfos, setPartyInfos,
      me, setMe,
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
