import React, { createContext, useState } from 'react'


export const AuthContext = createContext({});


export const AuthContextProvider = ({ children }) => {

    const [loggedUserData, setLoggedUserData] = useState(null);


    return (
        <AuthContext.Provider
            value={{
                loggedUserData, setLoggedUserData

            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
