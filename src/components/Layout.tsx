import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

export function Layout() {
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
        </div>
    );
}
