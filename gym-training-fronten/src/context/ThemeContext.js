import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = {
    neon: {
        id: 'neon',
        bg: '#0a0a0a',
        cardBg: 'rgba(255, 255, 255, 0.05)',
        text: '#ffffff',
        subText: '#a0a0a0',
        primary: '#00D1FF',
        secondary: '#00D1FF',
        accent: '#FF00E6',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        inputBg: '#111',
        shadow: '0 0 20px rgba(0, 209, 255, 0.1)',
        borderRadius: '12px',
        font: "'Rajdhani', sans-serif"
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
        font: "'Inter', sans-serif" // Assuming Inter is available or fallback to sans-serif
    }
};

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('theme') || 'neon';
    });

    useEffect(() => {
        localStorage.setItem('theme', currentTheme);
        // We can also apply a class to the body if global styles need it
        document.body.className = currentTheme === 'neon' ? 'dark-theme' : 'light-theme';
        document.body.style.backgroundColor = THEMES[currentTheme].bg;
        document.body.style.color = THEMES[currentTheme].text;
    }, [currentTheme]);

    const toggleTheme = () => {
        setCurrentTheme(prev => prev === 'neon' ? 'light' : 'neon');
    };

    const styles = THEMES[currentTheme];

    return (
        <ThemeContext.Provider value={{ currentTheme, toggleTheme, styles }}>
            {children}
        </ThemeContext.Provider>
    );
};
