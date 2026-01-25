import React, { useState, useEffect, useRef } from 'react';

const CardioTimer = ({ initialTime = 0, targetDuration = 0, onFinish, weight = 75 }) => {
    // Mode: 'stopwatch' (count up) or 'timer' (count down from target)
    const [mode, setMode] = useState(targetDuration > 0 ? 'timer' : 'stopwatch');
    // Using Ref for counting to avoid re-renders if we wanted smooth animation, but state is fine for text
    const [seconds, setSeconds] = useState(targetDuration > 0 ? targetDuration : 0);
    const [initialTarget, setInitialTarget] = useState(targetDuration);
    const [isActive, setIsActive] = useState(false);
    const [isRinging, setIsRinging] = useState(false);

    // Edit Mode state
    const [showEdit, setShowEdit] = useState(false);
    const [editMinutes, setEditMinutes] = useState('0');
    const [editSeconds, setEditSeconds] = useState('0');

    // Stats
    const MET = 8;
    const [elapsedTotal, setElapsedTotal] = useState(0);

    // Refs
    const intervalRef = useRef(null);
    const audioRef = useRef(null); // Web Audio

    useEffect(() => {
        // Initialize Audio
        audioRef.current = new Audio('/timer_alarm.mp3'); // Ensure this file exists in public/ or handle it
        audioRef.current.loop = true;

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            // eslint-disable-next-line react-hooks/exhaustive-deps
            stopAlarm();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Timer Logic
    useEffect(() => {
        if (isActive && !isRinging) {
            intervalRef.current = setInterval(() => {
                setSeconds(sec => {
                    if (mode === 'timer') {
                        if (sec <= 0) {
                            setIsActive(false);
                            handleTimerComplete();
                            return 0;
                        }
                        return sec - 1;
                    } else {
                        return sec + 1;
                    }
                });

                setElapsedTotal(total => total + 1);
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => clearInterval(intervalRef.current);
    }, [isActive, mode, isRinging, initialTarget]);

    const handleTimerComplete = () => {
        setIsRinging(true);
        // Play sound
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
        // Web Vibration API
        if (navigator.vibrate) {
            navigator.vibrate([0, 500, 200, 500]);
        }
    };

    const stopAlarm = () => {
        setIsRinging(false);
        if (navigator.vibrate) navigator.vibrate(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        // Reset to initial target after alarm stops
        setSeconds(initialTarget);
    };

    const toggleTimer = () => {
        if (isRinging) {
            stopAlarm();
            return;
        }
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        stopAlarm();
        setIsActive(false);
        setSeconds(mode === 'timer' ? initialTarget : 0);
        setElapsedTotal(0);
    };

    const handleFinishWorkout = () => {
        stopAlarm();
        const caloriesBurned = Math.round(MET * weight * (elapsedTotal / 3600));
        onFinish({
            duration: elapsedTotal,
            calories: caloriesBurned
        });
    };

    const openEdit = () => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        setEditMinutes(m.toString());
        setEditSeconds(s.toString());
        setShowEdit(true);
    };

    const saveEdit = () => {
        const m = parseInt(editMinutes) || 0;
        const s = parseInt(editSeconds) || 0;
        const totalSec = (m * 60) + s;

        if (totalSec > 0) {
            setInitialTarget(totalSec);
            setSeconds(totalSec);
            setMode('timer'); // Ensure timer mode
        }
        setShowEdit(false);
    };

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const getCalories = () => Math.round(MET * weight * (elapsedTotal / 3600));

    // Circle progress calc
    const radius = 80;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    // For timer: 0 = full, 1 = empty. We want 0 at start, circumference at end?
    // standard: strokeDashoffset = circumference - (percent / 100) * circumference
    // const progress = mode === 'timer' ? ((initialTarget - seconds) / initialTarget) : 0; // Unused
    // const strokeDashoffset = circumference - (progress * circumference); // Unused
    // Actually we want it to empty. 
    // If progress 0, offset should be 0 (full)? No, depends on styling.
    // Let's keep it simple: Ring is full, then empties.
    // Timer: Starts full (seconds = target). 
    const fillPercent = mode === 'timer' ? (seconds / initialTarget) : 1;
    const dashOffset = circumference * (1 - fillPercent);


    return (
        <div className="cardio-timer-container" style={{
            background: '#1a1a20',
            padding: '20px',
            borderRadius: '15px',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '350px',
            margin: '0 auto'
        }}>
            {/* Circle Timer */}
            <div
                onClick={isRinging ? stopAlarm : openEdit}
                style={{ position: 'relative', width: '200px', height: '200px', cursor: 'pointer', marginBottom: '20px' }}
            >
                <svg
                    height="200"
                    width="200"
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    <circle
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth={stroke}
                        fill="transparent"
                        r={normalizedRadius}
                        cx="100"
                        cy="100"
                    />
                    <circle
                        stroke={isRinging ? '#FFD700' : (mode === 'stopwatch' ? '#00ffaa' : '#00ffff')}
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset: mode === 'timer' ? dashOffset : 0, transition: 'stroke-dashoffset 0.5s linear' }}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx="100"
                        cy="100"
                    />
                </svg>

                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    {isRinging ? (
                        <>
                            <div style={{ color: '#FFD700', fontSize: '24px', fontWeight: 'bold' }}>TIME'S UP</div>
                            <div style={{ color: '#fff', fontSize: '12px' }}>TAP TO STOP</div>
                        </>
                    ) : (
                        <>
                            <div style={{ color: '#fff', fontSize: '40px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                {formatTime(seconds)}
                            </div>
                            <div style={{ color: isRinging ? '#FFD700' : (mode === 'stopwatch' ? '#00ffaa' : '#00ffff'), fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
                                {mode === 'timer' ? 'REMAINING' : 'ELAPSED'}
                            </div>
                            {!isActive && mode === 'timer' && (
                                <div style={{ color: '#666', fontSize: '16px', marginTop: '5px' }}>✎</div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{Math.floor(elapsedTotal / 60)}</div>
                    <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Min</div>
                </div>
                <div style={{ width: '1px', background: '#333' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{getCalories()}</div>
                    <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Kcal</div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                <button
                    onClick={resetTimer}
                    disabled={isRinging}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        opacity: isRinging ? 0.5 : 1
                    }}
                >
                    RESET
                </button>

                <button
                    onClick={toggleTimer}
                    style={{
                        flex: 1,
                        padding: '12px 20px',
                        borderRadius: '8px',
                        background: isActive ? '#ff4444' : '#00ffff',
                        border: 'none',
                        color: isActive ? '#fff' : '#000',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    {isRinging ? 'ALARM OFF' : (isActive ? 'PAUSE' : 'START')}
                </button>

                <button
                    onClick={handleFinishWorkout}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        background: '#00ffaa',
                        border: 'none',
                        color: '#000',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    FINISH
                </button>
            </div>

            {/* Edit Modal (Simple overlay) */}
            {showEdit && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#222',
                        padding: '25px',
                        borderRadius: '15px',
                        border: '1px solid #444',
                        width: '300px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ color: '#fff', marginTop: 0 }}>Set Duration</h3>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div>
                                <input
                                    type="number"
                                    value={editMinutes}
                                    onChange={(e) => setEditMinutes(e.target.value)}
                                    style={{ width: '60px', padding: '10px', background: '#333', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '20px', textAlign: 'center' }}
                                />
                                <div style={{ color: '#888', fontSize: '12px' }}>Min</div>
                            </div>
                            <div style={{ color: '#fff', fontSize: '24px', paddingBottom: '15px' }}>:</div>
                            <div>
                                <input
                                    type="number"
                                    value={editSeconds}
                                    onChange={(e) => setEditSeconds(e.target.value)}
                                    style={{ width: '60px', padding: '10px', background: '#333', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '20px', textAlign: 'center' }}
                                />
                                <div style={{ color: '#888', fontSize: '12px' }}>Sec</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowEdit(false)} style={{ flex: 1, padding: '10px', background: '#444', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={saveEdit} style={{ flex: 1, padding: '10px', background: '#00ffff', border: 'none', borderRadius: '5px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardioTimer;
