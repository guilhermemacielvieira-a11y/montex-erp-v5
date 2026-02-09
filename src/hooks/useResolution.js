/**
 * useResolution.js - Hook for detailed resolution detection and utilities
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Common resolution breakpoints
const BREAKPOINTS = {
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
    '3xl': 1920,
    '4xl': 2560,
    '5xl': 3440,
    '6xl': 3840,
    '7xl': 5120,
};

// Common monitor configurations
const MONITOR_CONFIGS = {
    'fhd': { width: 1920, height: 1080, name: 'Full HD', aspectRatio: '16:9' },
    'fhd-plus': { width: 2560, height: 1080, name: 'FHD Ultrawide', aspectRatio: '21:9' },
    'qhd': { width: 2560, height: 1440, name: 'QHD/2K', aspectRatio: '16:9' },
    'qhd-ultrawide': { width: 3440, height: 1440, name: 'QHD Ultrawide', aspectRatio: '21:9' },
    'super-ultrawide': { width: 5120, height: 1440, name: 'Super Ultrawide 49"', aspectRatio: '32:9' },
    '4k': { width: 3840, height: 2160, name: '4K UHD', aspectRatio: '16:9' },
    '5k': { width: 5120, height: 2880, name: '5K', aspectRatio: '16:9' },
};

/**
 * Main resolution detection hook
 */
export function useResolution() {
    const [resolution, setResolution] = useState(() => getResolutionInfo());

    useEffect(() => {
        const handleResize = () => {
            setResolution(getResolutionInfo());
        };

        window.addEventListener('resize', handleResize);

        // Also listen for orientation changes on mobile
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    return resolution;
}

/**
 * Get detailed resolution information
 */
function getResolutionInfo() {
    if (typeof window === 'undefined') {
        return getDefaultResolution();
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const screenWidth = window.screen?.width || width;
    const screenHeight = window.screen?.height || height;
    const pixelRatio = window.devicePixelRatio || 1;
    const effectiveWidth = screenWidth * pixelRatio;
    const effectiveHeight = screenHeight * pixelRatio;
    const aspectRatio = width / height;

    // Detect monitor type
    const monitorType = detectMonitorType(width, height, aspectRatio);

    // Calculate available space metrics
    const availableWidth = document.documentElement.clientWidth;
    const availableHeight = document.documentElement.clientHeight;

    return {
        // Viewport dimensions
        viewport: {
            width,
            height,
            area: width * height,
        },

        // Screen dimensions
        screen: {
            width: screenWidth,
            height: screenHeight,
            area: screenWidth * screenHeight,
        },

        // Effective (physical) dimensions
        effective: {
            width: effectiveWidth,
            height: effectiveHeight,
            area: effectiveWidth * effectiveHeight,
        },

        // Available space (minus scrollbars)
        available: {
            width: availableWidth,
            height: availableHeight,
        },

        // Pixel ratio
        pixelRatio,

        // Aspect ratio
        aspectRatio,
        aspectRatioFormatted: formatAspectRatio(aspectRatio),

        // Monitor type detection
        monitorType,
        monitorName: monitorType?.name || 'Unknown',

        // Boolean flags
        isUltrawide: aspectRatio > 1.9,
        isSuperUltrawide: aspectRatio > 2.5,
        isPortrait: aspectRatio < 1,
        isLandscape: aspectRatio >= 1,
        isRetina: pixelRatio > 1,
        is4K: effectiveWidth >= 3840 || effectiveHeight >= 2160,
        is5K: effectiveWidth >= 5120 || effectiveHeight >= 2880,

        // Breakpoint checks
        breakpoints: {
            xs: width < BREAKPOINTS.xs,
            sm: width >= BREAKPOINTS.sm,
            md: width >= BREAKPOINTS.md,
            lg: width >= BREAKPOINTS.lg,
            xl: width >= BREAKPOINTS.xl,
            '2xl': width >= BREAKPOINTS['2xl'],
            '3xl': width >= BREAKPOINTS['3xl'],
            '4xl': width >= BREAKPOINTS['4xl'],
            '5xl': width >= BREAKPOINTS['5xl'],
            '6xl': width >= BREAKPOINTS['6xl'],
            '7xl': width >= BREAKPOINTS['7xl'],
        },

        // Current breakpoint name
        currentBreakpoint: getCurrentBreakpoint(width),

        // Recommended columns for grids
        recommendedColumns: getRecommendedColumns(width, aspectRatio),

        // DPI estimation
        dpi: estimateDPI(screenWidth, screenHeight, pixelRatio),
    };
}

function getDefaultResolution() {
    return {
        viewport: { width: 1920, height: 1080, area: 1920 * 1080 },
        screen: { width: 1920, height: 1080, area: 1920 * 1080 },
        effective: { width: 1920, height: 1080, area: 1920 * 1080 },
        available: { width: 1920, height: 1080 },
        pixelRatio: 1,
        aspectRatio: 16/9,
        aspectRatioFormatted: '16:9',
        monitorType: MONITOR_CONFIGS.fhd,
        monitorName: 'Full HD',
        isUltrawide: false,
        isSuperUltrawide: false,
        isPortrait: false,
        isLandscape: true,
        isRetina: false,
        is4K: false,
        is5K: false,
        breakpoints: {
            xs: false, sm: true, md: true, lg: true, xl: true,
            '2xl': true, '3xl': true, '4xl': false, '5xl': false, '6xl': false, '7xl': false,
        },
        currentBreakpoint: '3xl',
        recommendedColumns: 4,
        dpi: 96,
    };
}

function detectMonitorType(width, height, aspectRatio) {
    // Super ultrawide 49" (32:9)
    if (aspectRatio > 2.5 && width >= 5000) {
        return MONITOR_CONFIGS['super-ultrawide'];
    }

    // Ultrawide QHD (21:9)
    if (aspectRatio > 1.9 && width >= 3400) {
        return MONITOR_CONFIGS['qhd-ultrawide'];
    }

    // FHD Ultrawide (21:9)
    if (aspectRatio > 1.9 && width >= 2500) {
        return MONITOR_CONFIGS['fhd-plus'];
    }

    // 5K
    if (width >= 5000 && height >= 2800) {
        return MONITOR_CONFIGS['5k'];
    }

    // 4K
    if (width >= 3800 && height >= 2100) {
        return MONITOR_CONFIGS['4k'];
    }

    // QHD/2K
    if (width >= 2500 && height >= 1400) {
        return MONITOR_CONFIGS.qhd;
    }

    // Full HD
    if (width >= 1900) {
        return MONITOR_CONFIGS.fhd;
    }

    return null;
}

function formatAspectRatio(ratio) {
    // Common aspect ratios
    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
    if (Math.abs(ratio - 16/10) < 0.1) return '16:10';
    if (Math.abs(ratio - 21/9) < 0.1) return '21:9';
    if (Math.abs(ratio - 32/9) < 0.1) return '32:9';
    if (Math.abs(ratio - 4/3) < 0.1) return '4:3';
    if (Math.abs(ratio - 3/2) < 0.1) return '3:2';

    return ratio.toFixed(2) + ':1';
}

function getCurrentBreakpoint(width) {
    if (width >= BREAKPOINTS['7xl']) return '7xl';
    if (width >= BREAKPOINTS['6xl']) return '6xl';
    if (width >= BREAKPOINTS['5xl']) return '5xl';
    if (width >= BREAKPOINTS['4xl']) return '4xl';
    if (width >= BREAKPOINTS['3xl']) return '3xl';
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
}

function getRecommendedColumns(width, aspectRatio) {
    // Super ultrawide gets more columns
    if (aspectRatio > 2.5) {
        if (width >= 5120) return 8;
        return 6;
    }

    // Ultrawide
    if (aspectRatio > 1.9) {
        if (width >= 3440) return 6;
        return 5;
    }

    // Standard aspect ratios
    if (width >= 3840) return 6;
    if (width >= 2560) return 5;
    if (width >= 1920) return 4;
    if (width >= 1280) return 3;
    if (width >= 768) return 2;
    return 1;
}

function estimateDPI(screenWidth, screenHeight, pixelRatio) {
    // Very rough estimation - assumes common monitor sizes
    const diagonal = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);

    // Common monitor sizes by resolution
    let assumedDiagonalInches;
    if (screenWidth >= 5120) assumedDiagonalInches = 49; // Super ultrawide
    else if (screenWidth >= 3840) assumedDiagonalInches = 32; // 4K
    else if (screenWidth >= 2560) assumedDiagonalInches = 27; // QHD
    else if (screenWidth >= 1920) assumedDiagonalInches = 24; // FHD
    else assumedDiagonalInches = 15; // Laptop

    return Math.round((diagonal / assumedDiagonalInches) * pixelRatio);
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

/**
 * Hook for breakpoint detection
 */
export function useBreakpoint(breakpoint) {
    const minWidth = BREAKPOINTS[breakpoint] || parseInt(breakpoint, 10);
    return useMediaQuery(`(min-width: ${minWidth}px)`);
}

/**
 * Hook to get current breakpoint name
 */
export function useCurrentBreakpoint() {
    const resolution = useResolution();
    return resolution.currentBreakpoint;
}

/**
 * Hook for ultrawide detection
 */
export function useIsUltrawide() {
    const resolution = useResolution();
    return resolution.isUltrawide;
}

/**
 * Hook for recommended columns
 */
export function useRecommendedColumns() {
    const resolution = useResolution();
    return resolution.recommendedColumns;
}

export { BREAKPOINTS, MONITOR_CONFIGS };
