import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  isAnyModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalCount, setModalCount] = useState(0);

  const setModalOpen = (open: boolean) => {
    setModalCount(prev => open ? prev + 1 : Math.max(0, prev - 1));
  };

  const value = {
    isAnyModalOpen: modalCount > 0,
    setModalOpen,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};