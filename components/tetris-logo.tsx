"use client"

import "@/styles/tetris-logo.css"

export function TetrisLogo() {
    return (
        <div className="tetris-loader-root">
            <div className="tetris-loader">
                <span className="tetris-block">J</span>
                <span className="tetris-block">A</span>
                <span className="tetris-block">B</span>
                <span className="tetris-block">S</span>
                <span className="tetris-block">O</span>
                <span className="tetris-block">N</span>
                <span className="tetris-block">A</span>
            </div>

            <div className="tetris-loader-text">MTS</div>
        </div>
    )
}
