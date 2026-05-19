import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const Navbar: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">shaghalny</Link>
            </div>
            <div className="navbar-links">
                <Link to="/jobs">Jobs</Link>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
            </div>
            <div className="navbar-auth">
                {isAuthenticated ? (
                    <>
                        <span>{user?.name}</span>
                        <button type="button" onClick={logout}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
