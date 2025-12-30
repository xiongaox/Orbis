export default function Navbar() {
    return (
        <header className="navbar">
            <div className="navbar-brand">
                <div className="logo">
                    <span className="logo-icon">☯</span>
                    <span className="logo-text">随心所欲</span>
                </div>
            </div>
            <nav className="navbar-nav">
                <a href="#" className="nav-link active">排盘</a>
                <a href="#" className="nav-link">大运</a>
                <a href="#" className="nav-link">流年</a>
                <a href="#" className="nav-link">合婚</a>
                <a href="#" className="nav-link">择日</a>
            </nav>
            <div className="navbar-actions">
                <button className="btn btn-ghost">
                    <span className="icon">🌙</span>
                </button>
                <button className="btn btn-primary">登录</button>
            </div>
        </header>
    );
}
