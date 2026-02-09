/**
 * DisplayContext.jsx - Context for display/appearance configuration
 * Manages resolution detection, UI density, font sizes, and layout preferences
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Display presets based on screen resolution
const DISPLAY_PRESETS = {
    // Standard monitors
    'compact': {
        name: 'Compacto',
        description: 'Para telas menores (HD/FHD)',
        minWidth: 0,
        columns: 2,
        fontSize: 'text-sm',
        spacing: 'gap-3',
        padding: 'p-3',
        cardSize: 'min-h-[150px]',
        iconSize: 16,
        showDetails: false,
        gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        sidebarWidth: 'w-64',
        density: 'compact',
    },
    'standard': {
        name: 'Padrão',
        description: 'Para telas Full HD (1920x1080)',
        minWidth: 1920,
        columns: 3,
        fontSize: 'text-base',
        spacing: 'gap-4',
        padding: 'p-4',
        cardSize: 'min-h-[180px]',
        iconSize: 20,
        showDetails: true,
        gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        sidebarWidth: 'w-72',
        density: 'standard',
    },
    'expanded': {
        name: 'Expandido',
        description: 'Para telas 2K/QHD (2560x1440)',
        minWidth: 2560,
        columns: 4,
        fontSize: 'text-base',
        spacing: 'gap-5',
        padding: 'p-5',
        cardSize: 'min-h-[200px]',
        iconSize: 22,
        showDetails: true,
        gridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        sidebarWidth: 'w-80',
        density: 'expanded',
    },
    'ultrawide': {
        name: 'Ultrawide',
        description: 'Para telas ultrawide (3440x1440+)',
        minWidth: 3440,
        columns: 5,
        fontSize: 'text-base',
        spacing: 'gap-5',
        padding: 'p-5',
        cardSize: 'min-h-[200px]',
        iconSize: 22,
        showDetails: true,
        gridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
        sidebarWidth: 'w-80',
        density: 'ultrawide',
    },
    'superultrawide': {
        name: 'Super Ultrawide 49"',
        description: 'Para monitores 49" (5120x1440)',
        minWidth: 5120,
        columns: 6,
        fontSize: 'text-sm',
        spacing: 'gap-4',
        padding: 'p-4',
        cardSize: 'min-h-[160px]',
        iconSize: 18,
        showDetails: true,
        gridCols: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8',
        sidebarWidth: 'w-72',
        density: 'superultrawide',
    },
    '4k': {
        name: '4K Ultra HD',
        description: 'Para telas 4K (3840x2160)',
        minWidth: 3840,
        columns: 5,
        fontSize: 'text-lg',
        spacing: 'gap-6',
        padding: 'p-6',
        cardSize: 'min-h-[220px]',
        iconSize: 26,
        showDetails: true,
        gridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
        sidebarWidth: 'w-96',
        density: '4k',
    },
};

// Theme presets
const THEME_PRESETS = {
    'cyber': {
        name: 'Cyber',
        primary: 'cyan',
        secondary: 'purple',
        accent: 'pink',
        background: 'from-slate-950 via-slate-900 to-slate-950',
        cardBg: 'bg-slate-900/50',
        borderColor: 'border-cyan-500/30',
        glowColor: 'shadow-cyan-500/20',
    },
    'matrix': {
        name: 'Matrix',
        primary: 'emerald',
        secondary: 'green',
        accent: 'lime',
        background: 'from-black via-slate-950 to-black',
        cardBg: 'bg-black/50',
        borderColor: 'border-emerald-500/30',
        glowColor: 'shadow-emerald-500/20',
    },
    'sunset': {
        name: 'Sunset',
        primary: 'orange',
        secondary: 'red',
        accent: 'yellow',
        background: 'from-slate-950 via-orange-950/20 to-slate-950',
        cardBg: 'bg-slate-900/50',
        borderColor: 'border-orange-500/30',
        glowColor: 'shadow-orange-500/20',
    },
    'ocean': {
        name: 'Ocean',
        primary: 'blue',
        secondary: 'indigo',
        accent: 'sky',
        background: 'from-slate-950 via-blue-950/20 to-slate-950',
        cardBg: 'bg-slate-900/50',
        borderColor: 'border-blue-500/30',
        glowColor: 'shadow-blue-500/20',
    },
    'royal': {
        name: 'Royal',
        primary: 'violet',
        secondary: 'purple',
        accent: 'fuchsia',
        background: 'from-slate-950 via-violet-950/20 to-slate-950',
        cardBg: 'bg-slate-900/50',
        borderColor: 'border-violet-500/30',
        glowColor: 'shadow-violet-500/20',
    },
    'infographic': {
        name: 'Infográfico',
        primary: 'rose',
        secondary: 'purple',
        accent: 'blue',
        background: 'from-[#1a1a2e] via-[#16213e] to-[#0f0f23]',
        cardBg: 'bg-[#1a1a2e]/70',
        borderColor: 'border-rose-500/30',
        glowColor: 'shadow-rose-500/20',
    },
};

// Animation intensity presets
const ANIMATION_PRESETS = {
    'off': { name: 'Desligado', multiplier: 0, particles: false, scanlines: false },
    'minimal': { name: 'Mínimo', multiplier: 0.5, particles: false, scanlines: false },
    'standard': { name: 'Padrão', multiplier: 1, particles: true, scanlines: false },
    'full': { name: 'Completo', multiplier: 1, particles: true, scanlines: true },
};

// Create context
const DisplayContext = createContext(null);

// Provider component
export function DisplayProvider({ children }) {
    // Screen info state
    const [screenInfo, setScreenInfo] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
        pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        isUltrawide: false,
        aspectRatio: 16/9,
    });

    // User preferences (persisted)
    const [preferences, setPreferences] = useState(() => {
        try {
            const saved = localStorage.getItem('montex-display-preferences');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        return {
            autoDetect: true,
            displayPreset: 'standard',
            theme: 'cyber',
            animations: 'standard',
            fontSize: 'normal', // small, normal, large, extra-large
            contrast: 'normal', // low, normal, high
            reducedMotion: false,
            showMiniCharts: true,
            compactMode: false,
            showTooltips: true,
            dataRefreshRate: 5000, // ms
        };
    });

    // Computed display settings
    const [displaySettings, setDisplaySettings] = useState(DISPLAY_PRESETS.standard);

    // Detect screen resolution and update settings
    const detectScreen = useCallback(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        const effectiveWidth = width * pixelRatio;
        const aspectRatio = width / height;
        const isUltrawide = aspectRatio > 2;

        setScreenInfo({
            width,
            height,
            pixelRatio,
            effectiveWidth,
            isUltrawide,
            aspectRatio,
        });

        // Auto-detect preset if enabled
        if (preferences.autoDetect) {
            let detectedPreset = 'compact';

            // Check for super ultrawide first (49" monitors)
            if (effectiveWidth >= 5120 || (width >= 3440 && isUltrawide)) {
                detectedPreset = 'superultrawide';
            }
            // 4K detection (based on height for 4K monitors)
            else if (height >= 2160 || effectiveWidth >= 3840) {
                detectedPreset = '4k';
            }
            // Ultrawide detection
            else if (isUltrawide && width >= 2560) {
                detectedPreset = 'ultrawide';
            }
            // 2K/QHD detection
            else if (width >= 2560) {
                detectedPreset = 'expanded';
            }
            // Full HD
            else if (width >= 1920) {
                detectedPreset = 'standard';
            }

            setDisplaySettings(DISPLAY_PRESETS[detectedPreset]);
        } else {
            setDisplaySettings(DISPLAY_PRESETS[preferences.displayPreset]);
        }
    }, [preferences.autoDetect, preferences.displayPreset]);

    // Listen for resize events
    useEffect(() => {
        detectScreen();

        const handleResize = () => {
            detectScreen();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [detectScreen]);

    // Save preferences to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('montex-display-preferences', JSON.stringify(preferences));
        } catch (e) {}
    }, [preferences]);

    // Update individual preference
    const updatePreference = useCallback((key, value) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    }, []);

    // Set display preset manually
    const setDisplayPreset = useCallback((preset) => {
        if (DISPLAY_PRESETS[preset]) {
            setPreferences(prev => ({ ...prev, displayPreset: preset, autoDetect: false }));
            setDisplaySettings(DISPLAY_PRESETS[preset]);
        }
    }, []);

    // Reset to auto-detect
    const resetToAutoDetect = useCallback(() => {
        setPreferences(prev => ({ ...prev, autoDetect: true }));
        detectScreen();
    }, [detectScreen]);

    // Get current theme
    const currentTheme = THEME_PRESETS[preferences.theme] || THEME_PRESETS.cyber;

    // Get current animation settings
    const animationSettings = ANIMATION_PRESETS[preferences.animations] || ANIMATION_PRESETS.standard;

    // Font size multipliers
    const fontSizeMultiplier = {
        'small': 0.875,
        'normal': 1,
        'large': 1.125,
        'extra-large': 1.25,
    }[preferences.fontSize] || 1;

    // Context value
    const value = {
        // Screen information
        screenInfo,

        // Display settings (computed from preset)
        displaySettings,

        // User preferences
        preferences,
        updatePreference,

        // Preset controls
        setDisplayPreset,
        resetToAutoDetect,
        displayPresets: DISPLAY_PRESETS,

        // Theme
        currentTheme,
        themes: THEME_PRESETS,
        setTheme: (theme) => updatePreference('theme', theme),

        // Animations
        animationSettings,
        animationPresets: ANIMATION_PRESETS,

        // Computed values
        fontSizeMultiplier,

        // Helper functions
        getGridClass: () => displaySettings.gridCols,
        getSpacingClass: () => displaySettings.spacing,
        getPaddingClass: () => displaySettings.padding,
        getCardClass: () => `${displaySettings.cardSize} ${displaySettings.padding}`,
        shouldShowDetails: () => displaySettings.showDetails,
        getIconSize: () => displaySettings.iconSize,
    };

    return (
        <DisplayContext.Provider value={value}>
            {children}
        </DisplayContext.Provider>
    );
}

// Custom hook to use display context
export function useDisplay() {
    const context = useContext(DisplayContext);
    if (!context) {
        throw new Error('useDisplay must be used within a DisplayProvider');
    }
    return context;
}

// Utility hook for responsive values
export function useResponsiveValue(values) {
    const { displaySettings } = useDisplay();
    const density = displaySettings.density;

    return values[density] || values.standard || values.compact;
}

export { DISPLAY_PRESETS, THEME_PRESETS, ANIMATION_PRESETS };
