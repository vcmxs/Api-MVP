import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = {
    neon: {
        id: 'neon',
        bg: '#07090F',
        cardBg: 'rgba(255, 255, 255, 0.04)',
        text: '#EDF2F7',
        subText: '#8892A4',
        primary: '#00C4FF',
        secondary: '#8B5CF6',
        accent: '#8B5CF6',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        inputBg: 'rgba(255, 255, 255, 0.05)',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        borderRadius: '14px',
        font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    light: {
        id: 'light',
        bg: '#F3F4F6',
        cardBg: '#ffffff',
        text: '#1F2937',
        subText: '#6B7280',
        primary: '#2563EB',
        secondary: '#10B981',
        accent: '#F59E0B',
        border: '1px solid #E5E7EB',
        inputBg: '#F9FAFB',
        shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        borderRadius: '20px',
        font: "'Inter', sans-serif"
    }
};

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'neon');

    useEffect(() => {
        localStorage.setItem('theme', currentTheme);
        document.body.className = currentTheme === 'neon' ? 'dark-theme' : 'light-theme';
        document.body.style.backgroundColor = THEMES[currentTheme].bg;
        document.body.style.color = THEMES[currentTheme].text;
    }, [currentTheme]);

    const toggleTheme = () => setCurrentTheme(prev => prev === 'neon' ? 'light' : 'neon');

    return (
        <ThemeContext.Provider value={{ currentTheme, toggleTheme, styles: THEMES[currentTheme] }}>
            {children}
        </ThemeContext.Provider>
    );
};
