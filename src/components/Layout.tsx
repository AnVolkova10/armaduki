import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

import useAppStore from '../store/useAppStore';

export function Layout() {
    const { privacyMode, togglePrivacyMode } = useAppStore();

    return (
        <div className="layout">
            <header className="header">
                <h1 className="logo">armaduki</h1>
                <nav className="nav">
                    <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        People
                    </NavLink>
                    <NavLink to="/match" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        Match
                    </NavLink>
                </nav>
            </header>
            <main className="main">
                <Outlet />
            </main>
            <footer className="footer">
                <div className="footer-signature">
                    Ángela Curzi 2026
                </div>
                <div className="footer-actions">
                    <button
                        className="privacy-toggle-mini"
                        onClick={(e) => { if (e.detail === 3) togglePrivacyMode(); }}
                    >
                        {privacyMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                <line x1="2" x2="22" y1="2" y2="22" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
}
