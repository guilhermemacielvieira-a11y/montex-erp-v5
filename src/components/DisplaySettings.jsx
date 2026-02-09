/**
 * DisplaySettings.jsx - Visual settings panel for display configuration
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    Monitor,
    Palette,
    Zap,
    Eye,
    Layout,
    Maximize,
    Minimize,
    Sun,
    Moon,
    Sparkles,
    Gauge,
    Grid3X3,
    Type,
    RefreshCw,
    Check,
    X,
    ChevronRight,
    Info,
    MonitorSmartphone,
    Tv2,
    Laptop,
    RotateCcw,
} from 'lucide-react';
import { useDisplay } from '../contexts/DisplayContext';
import { useResolution } from '../hooks/useResolution';

// Tab icons
const TAB_CONFIG = [
    { id: 'resolution', label: 'Resolução', icon: Monitor },
    { id: 'theme', label: 'Tema', icon: Palette },
    { id: 'density', label: 'Densidade', icon: Grid3X3 },
    { id: 'animations', label: 'Animações', icon: Zap },
    { id: 'accessibility', label: 'Acessibilidade', icon: Eye },
];

// Monitor icons by type
const MONITOR_ICONS = {
    compact: Laptop,
    standard: Monitor,
    expanded: Tv2,
    ultrawide: Tv2,
    superultrawide: Maximize,
    '4k': Tv2,
};

export default function DisplaySettings({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('resolution');
    const {
        screenInfo,
        displaySettings,
        preferences,
        updatePreference,
        setDisplayPreset,
        resetToAutoDetect,
        displayPresets,
        currentTheme,
        themes,
        setTheme,
        animationSettings,
        animationPresets,
    } = useDisplay();
    const resolution = useResolution();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 w-full max-w-4xl max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                <Settings className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Configurações de Exibição</h2>
                                <p className="text-sm text-slate-400">
                                    {resolution.monitorName} • {resolution.viewport.width}×{resolution.viewport.height} • {resolution.aspectRatioFormatted}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex h-[calc(90vh-180px)]">
                        {/* Tabs Sidebar */}
                        <div className="w-56 border-r border-cyan-500/20 p-4 space-y-2">
                            {TAB_CONFIG.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                            isActive
                                                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-white'
                                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                                        <span className="font-medium">{tab.label}</span>
                                        {isActive && (
                                            <ChevronRight className="w-4 h-4 ml-auto text-cyan-400" />
                                        )}
                                    </button>
                                );
                            })}

                            {/* Screen Info Card */}
                            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <MonitorSmartphone className="w-4 h-4 text-cyan-400" />
                                    <span className="text-xs font-medium text-slate-300">Tela Detectada</span>
                                </div>
                                <div className="space-y-1 text-xs text-slate-400">
                                    <p>Resolução: <span className="text-white">{resolution.viewport.width}×{resolution.viewport.height}</span></p>
                                    <p>Pixel Ratio: <span className="text-white">{resolution.pixelRatio.toFixed(1)}x</span></p>
                                    <p>Aspecto: <span className="text-white">{resolution.aspectRatioFormatted}</span></p>
                                    <p>Colunas: <span className="text-cyan-400">{resolution.recommendedColumns}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {activeTab === 'resolution' && (
                                    <ResolutionTab
                                        key="resolution"
                                        preferences={preferences}
                                        updatePreference={updatePreference}
                                        displayPresets={displayPresets}
                                        setDisplayPreset={setDisplayPreset}
                                        resetToAutoDetect={resetToAutoDetect}
                                        resolution={resolution}
                                        displaySettings={displaySettings}
                                    />
                                )}
                                {activeTab === 'theme' && (
                                    <ThemeTab
                                        key="theme"
                                        themes={themes}
                                        currentTheme={currentTheme}
                                        setTheme={setTheme}
                                        preferences={preferences}
                                    />
                                )}
                                {activeTab === 'density' && (
                                    <DensityTab
                                        key="density"
                                        preferences={preferences}
                                        updatePreference={updatePreference}
                                    />
                                )}
                                {activeTab === 'animations' && (
                                    <AnimationsTab
                                        key="animations"
                                        preferences={preferences}
                                        updatePreference={updatePreference}
                                        animationPresets={animationPresets}
                                        animationSettings={animationSettings}
                                    />
                                )}
                                {activeTab === 'accessibility' && (
                                    <AccessibilityTab
                                        key="accessibility"
                                        preferences={preferences}
                                        updatePreference={updatePreference}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-cyan-500/20 bg-slate-900/50 flex items-center justify-between">
                        <button
                            onClick={() => {
                                resetToAutoDetect();
                                updatePreference('theme', 'cyber');
                                updatePreference('animations', 'standard');
                                updatePreference('fontSize', 'normal');
                                updatePreference('contrast', 'normal');
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Restaurar Padrões
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-purple-400 transition-all shadow-lg shadow-cyan-500/20"
                        >
                            <Check className="w-4 h-4" />
                            Aplicar
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Resolution Tab
function ResolutionTab({ preferences, updatePreference, displayPresets, setDisplayPreset, resetToAutoDetect, resolution, displaySettings }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Modo de Exibição</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Configure como a interface se adapta à resolução do seu monitor.
                </p>
            </div>

            {/* Auto-detect Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <RefreshCw className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">Detecção Automática</p>
                        <p className="text-sm text-slate-400">Ajustar automaticamente baseado na resolução</p>
                    </div>
                </div>
                <button
                    onClick={() => preferences.autoDetect ? updatePreference('autoDetect', false) : resetToAutoDetect()}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                        preferences.autoDetect ? 'bg-cyan-500' : 'bg-slate-600'
                    }`}
                >
                    <span
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                            preferences.autoDetect ? 'left-8' : 'left-1'
                        }`}
                    />
                </button>
            </div>

            {/* Preset Cards */}
            <div className="grid grid-cols-2 gap-4">
                {Object.entries(displayPresets).map(([key, preset]) => {
                    const Icon = MONITOR_ICONS[key] || Monitor;
                    const isSelected = !preferences.autoDetect && preferences.displayPreset === key;
                    const isDetected = preferences.autoDetect && displaySettings.density === key;

                    return (
                        <button
                            key={key}
                            onClick={() => setDisplayPreset(key)}
                            disabled={preferences.autoDetect}
                            className={`relative p-4 rounded-xl border transition-all text-left ${
                                isSelected || isDetected
                                    ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/50'
                                    : preferences.autoDetect
                                    ? 'bg-slate-800/30 border-slate-700/30 opacity-50'
                                    : 'bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/30'
                            }`}
                        >
                            {(isSelected || isDetected) && (
                                <div className="absolute top-2 right-2">
                                    <Check className="w-4 h-4 text-cyan-400" />
                                </div>
                            )}
                            <Icon className={`w-8 h-8 mb-2 ${isSelected || isDetected ? 'text-cyan-400' : 'text-slate-400'}`} />
                            <p className="font-medium text-white">{preset.name}</p>
                            <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 bg-slate-700/50 rounded text-slate-300">
                                    {preset.columns} colunas
                                </span>
                                {preset.minWidth > 0 && (
                                    <span className="text-xs px-2 py-0.5 bg-slate-700/50 rounded text-slate-300">
                                        {preset.minWidth}px+
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                    <p className="font-medium">Dica para monitores ultrawide</p>
                    <p className="text-blue-300/80 mt-1">
                        Para monitores 49" com resolução 5120×1440, use a página <strong>Command Center Ultrawide</strong> no menu lateral para máxima densidade de informações.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// Theme Tab
function ThemeTab({ themes, currentTheme, setTheme, preferences }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Tema de Cores</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Escolha um esquema de cores para a interface.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {Object.entries(themes).map(([key, theme]) => {
                    const isSelected = preferences.theme === key;

                    return (
                        <button
                            key={key}
                            onClick={() => setTheme(key)}
                            className={`relative p-4 rounded-xl border transition-all ${
                                isSelected
                                    ? `bg-gradient-to-br ${theme.background} border-${theme.primary}-500/50`
                                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                            }`}
                        >
                            {isSelected && (
                                <div className="absolute top-2 right-2">
                                    <Check className={`w-4 h-4 text-${theme.primary}-400`} />
                                </div>
                            )}

                            {/* Color Preview */}
                            <div className="flex gap-2 mb-3">
                                <div className={`w-6 h-6 rounded-full bg-${theme.primary}-500`} />
                                <div className={`w-6 h-6 rounded-full bg-${theme.secondary}-500`} />
                                <div className={`w-6 h-6 rounded-full bg-${theme.accent}-500`} />
                            </div>

                            <p className="font-medium text-white">{theme.name}</p>
                        </button>
                    );
                })}
            </div>

            {/* Preview Card */}
            <div className={`p-6 rounded-xl bg-gradient-to-br ${currentTheme.background} border ${currentTheme.borderColor}`}>
                <h4 className="text-white font-semibold mb-4">Preview do Tema</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                        <Sparkles className={`w-6 h-6 text-${currentTheme.primary}-400 mb-2`} />
                        <p className="text-white text-sm font-medium">Card Primário</p>
                        <p className={`text-${currentTheme.primary}-400 text-xs`}>Destaque</p>
                    </div>
                    <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                        <Gauge className={`w-6 h-6 text-${currentTheme.secondary}-400 mb-2`} />
                        <p className="text-white text-sm font-medium">Card Secundário</p>
                        <p className={`text-${currentTheme.secondary}-400 text-xs`}>Destaque</p>
                    </div>
                    <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                        <Zap className={`w-6 h-6 text-${currentTheme.accent}-400 mb-2`} />
                        <p className="text-white text-sm font-medium">Card Accent</p>
                        <p className={`text-${currentTheme.accent}-400 text-xs`}>Destaque</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Density Tab
function DensityTab({ preferences, updatePreference }) {
    const densityOptions = [
        { value: 'small', label: 'Compacto', description: 'Mais informações em menos espaço', icon: Minimize },
        { value: 'normal', label: 'Normal', description: 'Equilíbrio entre espaço e informação', icon: Layout },
        { value: 'large', label: 'Confortável', description: 'Mais espaço entre elementos', icon: Maximize },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Densidade da Interface</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Ajuste o espaçamento e tamanho dos elementos.
                </p>
            </div>

            {/* Font Size */}
            <div>
                <label className="text-sm font-medium text-slate-300 mb-3 block">Tamanho da Fonte</label>
                <div className="grid grid-cols-4 gap-3">
                    {['small', 'normal', 'large', 'extra-large'].map((size) => (
                        <button
                            key={size}
                            onClick={() => updatePreference('fontSize', size)}
                            className={`p-3 rounded-xl border transition-all text-center ${
                                preferences.fontSize === size
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            <Type className={`w-5 h-5 mx-auto mb-1 ${
                                size === 'small' ? 'scale-75' :
                                size === 'large' ? 'scale-110' :
                                size === 'extra-large' ? 'scale-125' : ''
                            }`} />
                            <span className="text-xs capitalize">{size.replace('-', ' ')}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Spacing Density */}
            <div>
                <label className="text-sm font-medium text-slate-300 mb-3 block">Espaçamento</label>
                <div className="grid grid-cols-3 gap-4">
                    {densityOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                onClick={() => updatePreference('spacing', option.value)}
                                className={`p-4 rounded-xl border transition-all ${
                                    preferences.spacing === option.value
                                        ? 'bg-cyan-500/20 border-cyan-500/50'
                                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                                }`}
                            >
                                <Icon className={`w-8 h-8 mx-auto mb-2 ${
                                    preferences.spacing === option.value ? 'text-cyan-400' : 'text-slate-400'
                                }`} />
                                <p className="text-white font-medium text-sm">{option.label}</p>
                                <p className="text-xs text-slate-400 mt-1">{option.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
                <ToggleOption
                    label="Mostrar Mini Gráficos"
                    description="Exibir gráficos em miniatura nos cards"
                    value={preferences.showMiniCharts}
                    onChange={(v) => updatePreference('showMiniCharts', v)}
                />
                <ToggleOption
                    label="Modo Compacto"
                    description="Reduzir padding e margens"
                    value={preferences.compactMode}
                    onChange={(v) => updatePreference('compactMode', v)}
                />
                <ToggleOption
                    label="Mostrar Tooltips"
                    description="Exibir dicas ao passar o mouse"
                    value={preferences.showTooltips}
                    onChange={(v) => updatePreference('showTooltips', v)}
                />
            </div>
        </motion.div>
    );
}

// Animations Tab
function AnimationsTab({ preferences, updatePreference, animationPresets, animationSettings }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Animações e Efeitos</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Configure a intensidade das animações e efeitos visuais.
                </p>
            </div>

            {/* Animation Presets */}
            <div className="grid grid-cols-2 gap-4">
                {Object.entries(animationPresets).map(([key, preset]) => {
                    const isSelected = preferences.animations === key;

                    return (
                        <button
                            key={key}
                            onClick={() => updatePreference('animations', key)}
                            className={`p-4 rounded-xl border transition-all text-left ${
                                isSelected
                                    ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/50'
                                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                            }`}
                        >
                            {isSelected && (
                                <div className="absolute top-2 right-2">
                                    <Check className="w-4 h-4 text-cyan-400" />
                                </div>
                            )}
                            <Zap className={`w-6 h-6 mb-2 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                            <p className="font-medium text-white">{preset.name}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {preset.particles && (
                                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 rounded text-cyan-300">
                                        Partículas
                                    </span>
                                )}
                                {preset.scanlines && (
                                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 rounded text-purple-300">
                                        Scanlines
                                    </span>
                                )}
                                {preset.multiplier === 0 && (
                                    <span className="text-xs px-2 py-0.5 bg-slate-700/50 rounded text-slate-400">
                                        Sem animações
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Data Refresh Rate */}
            <div>
                <label className="text-sm font-medium text-slate-300 mb-3 block">
                    Taxa de Atualização de Dados
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { value: 1000, label: '1s' },
                        { value: 3000, label: '3s' },
                        { value: 5000, label: '5s' },
                        { value: 10000, label: '10s' },
                    ].map((option) => (
                        <button
                            key={option.value}
                            onClick={() => updatePreference('dataRefreshRate', option.value)}
                            className={`p-3 rounded-xl border transition-all ${
                                preferences.dataRefreshRate === option.value
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            <RefreshCw className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-xs">{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Performance Note */}
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <Info className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                    <p className="font-medium">Nota de Performance</p>
                    <p className="text-yellow-300/80 mt-1">
                        Animações completas podem impactar a performance em dispositivos mais antigos. Se notar lentidão, reduza para "Mínimo" ou "Desligado".
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// Accessibility Tab
function AccessibilityTab({ preferences, updatePreference }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Acessibilidade</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Configure opções de acessibilidade para melhorar a experiência.
                </p>
            </div>

            {/* Contrast */}
            <div>
                <label className="text-sm font-medium text-slate-300 mb-3 block">Contraste</label>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { value: 'low', label: 'Baixo', icon: Sun },
                        { value: 'normal', label: 'Normal', icon: Eye },
                        { value: 'high', label: 'Alto', icon: Moon },
                    ].map((option) => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                onClick={() => updatePreference('contrast', option.value)}
                                className={`p-4 rounded-xl border transition-all ${
                                    preferences.contrast === option.value
                                        ? 'bg-cyan-500/20 border-cyan-500/50'
                                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                                }`}
                            >
                                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                                    preferences.contrast === option.value ? 'text-cyan-400' : 'text-slate-400'
                                }`} />
                                <p className="text-white font-medium text-sm">{option.label}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
                <ToggleOption
                    label="Reduzir Movimentos"
                    description="Minimizar animações e transições"
                    value={preferences.reducedMotion}
                    onChange={(v) => updatePreference('reducedMotion', v)}
                />
            </div>
        </motion.div>
    );
}

// Reusable Toggle Component
function ToggleOption({ label, description, value, onChange }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div>
                <p className="font-medium text-white">{label}</p>
                <p className="text-sm text-slate-400">{description}</p>
            </div>
            <button
                onClick={() => onChange(!value)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                    value ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
            >
                <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        value ? 'left-8' : 'left-1'
                    }`}
                />
            </button>
        </div>
    );
}

// Floating Settings Button Component (to be used in Layout)
export function DisplaySettingsButton({ onClick }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all"
            title="Configurações de Exibição"
        >
            <Settings className="w-5 h-5 text-slate-400 hover:text-cyan-400" />
        </motion.button>
    );
}
