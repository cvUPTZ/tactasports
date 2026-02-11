import React from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMatchContext } from '@/contexts/MatchContext';
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { useIndexState } from '@/hooks/index/useIndexState';
import { useIndexEffects } from '@/hooks/index/useIndexEffects';
import { useIndexHandlers } from '@/hooks/index/useIndexHandlers';
import { useGamepad } from '@/hooks/useGamepad';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { MainLayout } from '@/layouts/MainLayout';
import { SafetyBoundary } from '@/components/common/SafetyBoundary';

export function IndexContent() {
    const auth = useAuth();
    const match = useMatchContext();
    const socketContext = useSocketContext();
    const layout = useDashboardLayout();

    // 1. Compose State
    const indexState = useIndexState(auth, match, socketContext);

    // 2. Compose side-effects
    useIndexEffects(indexState);

    // 3. Compose Handlers
    const handlers = useIndexHandlers(indexState);

    // 4. Gamepad integration (lives in a grey area between state and handlers)
    const gamepad = useGamepad(
        handlers.handleEventLogged,
        indexState.gamepadConfig,
        indexState.setIsVideoPlaying
    );

    // Combine everything for the layout
    const allProps = {
        ...indexState,
        ...handlers,
        ...gamepad,
        ...layout
    };

    const layoutComponent = <MainLayout {...allProps} />;

    return (
        <SafetyBoundary name="IndexContent">
            <>
                {layoutComponent}
                {indexState.pipWindow && createPortal(layoutComponent, indexState.pipWindow.document.body)}
            </>
        </SafetyBoundary>
    );
}
