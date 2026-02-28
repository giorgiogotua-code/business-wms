import { TetrisLogo } from "@/components/tetris-logo"

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="scale-100">
                <TetrisLogo />
            </div>
        </div>
    )
}
