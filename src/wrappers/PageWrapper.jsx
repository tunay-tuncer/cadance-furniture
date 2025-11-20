import React, { useContext, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react';

// Styles
import "../styles/globals.scss";

// Components
import Navbar from '../components/shared_components/Navbar';

// Supabase
import usersDB from '../config/usersDB';

// Context
import { AuthContext } from '../context/AuthContext';


const PageWrapper = ({ children }) => {

    const { user: userSession, isAuthenticated, isLoading: isAuthLoading, error: authError } = useAuth0();
    const { loggedUserData, setLoggedUserData } = useContext(AuthContext);


    useEffect(() => {
        !isAuthLoading && isAuthenticated && usersDB.fetchUserData(userSession, setLoggedUserData);

    }, [isAuthLoading]);

    return (
        <div>
            <Navbar />
            {/* Will be removed */}
            {!isAuthLoading && isAuthenticated && <img src={loggedUserData?.profile_image} alt="profile-img" />}
            {/* Will be removed */}
            {children}
        </div>
    );
}

export default PageWrapper;