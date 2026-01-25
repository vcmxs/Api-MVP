import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const NutritionCalculator = ({ userId }) => {
    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // User Stats
    const [stats, setStats] = useState({
        weight: '',
        height: '',
        age: '',
        sex: 'male'
    });

    // Goals State
    const [goals, setGoals] = useState({
        calories: 2000,
        protein: 150,
        carbs: 250,
        fats: 70
    });

    // Calculator State
    const [activityLevel, setActivityLevel] = useState(1.2);
    const [goalType, setGoalType] = useState('maintain'); // maintain, cut, bulk
    const [results, setResults] = useState(null);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            // 1. Get User Profile for stats
            const profileRes = await axios.get(`${API_URL}/users/${userId}/profile`);
            // Fix: Profile data is directly in profileRes.data (based on UserProfile.js pattern)
            // But we must check structure carefully. UserProfile uses response.data.
            // Let's assume response.data IS the profile object or contains it.
            // If UserProfile says setFormData({...response.data}), then response.data has weight/height.
            const profileData = profileRes.data.profile || profileRes.data;

            if (profileData) {
                setStats({
                    weight: profileData.weight || '',
                    height: profileData.height || '',
                    age: profileData.age || '',
                    sex: profileData.sex || 'male'
                });
            }

            // 2. Get Nutrition Goals/Summary for Selected Date
            const token = localStorage.getItem('token');
            const goalsRes = await axios.get(`${API_URL}/nutrition/summary/${selectedDate}?userId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (goalsRes.data.summary) {
                const s = goalsRes.data.summary;
                setGoals({
                    calories: s.calorie_goal || 2000,
                    protein: s.protein_goal || 150,
                    carbs: s.carb_goal || 250,
                    fats: s.fat_goal || 70
                });
            }
            setLoading(false);
        } catch (err) {
            console.error('Error loading nutrition data:', err);
            setLoading(false);
        }
    };

    const changeDate = (days) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const calculate = () => {
        if (!stats.weight || !stats.height || !stats.age) {
            alert('Please update your profile with Weight, Height, and Age in the Profile section first.');
            return;
        }

        const weight = parseFloat(stats.weight);
        const height = parseFloat(stats.height);
        const age = parseInt(stats.age);

        // Mifflin-St Jeor
        let bmr = (10 * weight) + (6.25 * height) - (5 * age);
        if (stats.sex.toLowerCase() === 'male' || stats.sex === 'm') {
            bmr += 5;
        } else {
            bmr -= 161;
        }

        // TDEE
        const tdee = bmr * activityLevel;

        // Goal Adjustment
        let targetCalories = tdee;
        if (goalType === 'cut') targetCalories -= 500;
        if (goalType === 'bulk') targetCalories += 500;

        // Macros (Protein 2g/kg)
        let targetProtein = weight * 2;

        // Fat (0.8g/kg)
        let targetFat = weight * 0.8;

        // Remainder Carbs
        const proteinCals = targetProtein * 4;
        const fatCals = targetFat * 9;
        let remainingCals = targetCalories - proteinCals - fatCals;
        let targetCarbs = remainingCals / 4;

        setResults({
            calories: Math.round(targetCalories),
            protein: Math.round(targetProtein),
            carbs: Math.round(targetCarbs),
            fats: Math.round(targetFat)
        });
    };

    const saveGoals = async () => {
        if (!results) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            // Save for selected date
            await axios.put(`${API_URL}/nutrition/goals`, {
                calorie_goal: results.calories,
                protein_goal: results.protein,
                carb_goal: results.carbs,
                fat_goal: results.fats,
                date: selectedDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setGoals({
                calories: results.calories,
                protein: results.protein,
                carbs: results.carbs,
                fats: results.fats
            });

            setResults(null);
            alert('Goals updated successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save goals');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ color: '#fff' }}>
            {/* Header / Date Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Nutrition & Macros</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.1)', padding: '5px 15px', borderRadius: '20px' }}>
                    <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: '#00ffff', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
                    <span style={{ fontWeight: 'bold' }}>
                        {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
                    </span>
                    <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', color: '#00ffff', fontSize: '1.2rem', cursor: 'pointer' }}>→</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Calculator */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginTop: 0 }}>🧮 Calculator</h3>

                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#aaa' }}>
                        Based on your profile: {stats.weight ? `${stats.weight}kg, ${stats.height}cm, ${stats.age}y` : <span style={{ color: 'orange' }}>Profile incomplete</span>}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label>Activity Level</label>
                        <select
                            value={activityLevel}
                            onChange={(e) => setActivityLevel(parseFloat(e.target.value))}
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid #333' }}
                        >
                            <option value={1.2}>Sedentary (Office job)</option>
                            <option value={1.375}>Light Exercise (1-2 days/week)</option>
                            <option value={1.55}>Moderate Exercise (3-5 days/week)</option>
                            <option value={1.725}>Heavy Exercise (6-7 days/week)</option>
                            <option value={1.9}>Athlete (2x per day)</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label>Goal</label>
                        <select
                            value={goalType}
                            onChange={(e) => setGoalType(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid #333' }}
                        >
                            <option value="cut">Fat Loss (-500 cal)</option>
                            <option value="maintain">Maintenance</option>
                            <option value="bulk">Muscle Gain (+500 cal)</option>
                        </select>
                    </div>

                    <button
                        onClick={calculate}
                        style={{ width: '100%', padding: '12px', background: 'linear-gradient(45deg, #00ffff, #0080ff)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Calculate Targets
                    </button>

                    {results && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0, 255, 255, 0.1)', borderRadius: '10px', animation: 'fadeIn 0.5s' }}>
                            <div style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 'bold', fontSize: '1.2rem', color: '#00ffff' }}>
                                {results.calories} kcal
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span>Protein: {results.protein}g</span>
                                <span>Carbs: {results.carbs}g</span>
                                <span>Fats: {results.fats}g</span>
                            </div>
                            <button
                                onClick={saveGoals}
                                disabled={saving}
                                style={{
                                    width: '100%',
                                    marginTop: '1rem',
                                    padding: '10px',
                                    background: '#00ffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: saving ? 'wait' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Set as Daily Goals'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Current Goals Display */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginTop: 0 }}>🎯 Current Goals ({selectedDate})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', height: '80%' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fff' }}>{goals.calories}</div>
                            <div style={{ color: '#888' }}>Daily Calories</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', color: '#00C851', fontWeight: 'bold' }}>{goals.protein}g</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Protein</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', color: '#ffbb33', fontWeight: 'bold' }}>{goals.carbs}g</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Carbs</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', color: '#ff4444', fontWeight: 'bold' }}>{goals.fats}g</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Fats</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Food Journal Section */}
            <FoodJournal userId={userId} dailyGoals={goals} selectedDate={selectedDate} />
        </div>
    );
};

const FoodJournal = ({ userId, dailyGoals, selectedDate }) => {
    const [foods, setFoods] = useState([]);
    const [summary, setSummary] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [logging, setLogging] = useState(false);

    useEffect(() => {
        loadLogs();
    }, [userId, selectedDate]);

    const loadLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/nutrition/summary/${selectedDate}?userId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.meals) {
                setFoods(res.data.meals);
                // Use the summary provided by the backend
                setSummary({
                    calories: res.data.summary ? res.data.summary.total_calories : 0,
                    protein: res.data.summary ? res.data.summary.total_proteins : 0,
                    carbs: res.data.summary ? res.data.summary.total_carbs : 0,
                    fats: res.data.summary ? res.data.summary.total_fats : 0
                });
            } else {
                setFoods([]);
                setSummary({ calories: 0, protein: 0, carbs: 0, fats: 0 });
            }
        } catch (err) {
            console.error('Error loading logs:', err);
        }
    };

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async () => {
        setIsSearching(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/nutrition/foods`, {
                params: { query: searchQuery, limit: 10 },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectFood = (food) => {
        setSelectedFood(food);
        setQuantity(food.serving_size ? food.serving_size.toString() : '100');
        setSearchQuery('');
        setSearchResults([]);
    };

    const logFood = async () => {
        if (!selectedFood || !quantity) return;

        setLogging(true);
        try {
            const token = localStorage.getItem('token');

            await axios.post(`${API_URL}/nutrition/meals`, {
                food_id: selectedFood.id,
                meal_type: 'snack', // Default for now
                serving_quantity: parseFloat(quantity),
                notes: '',
                date: selectedDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Reload
            loadLogs();
            setSelectedFood(null);
            setQuantity('');
        } catch (err) {
            console.error('Log error:', err);
            alert('Failed to log meal');
        } finally {
            setLogging(false);
        }
    };

    const removeFood = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/nutrition/meals/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadLogs();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const getProgressColor = (current, target) => {
        if (target <= 0) return '#444';
        const pct = (current / target) * 100;
        if (pct > 110) return '#ff4444';
        if (pct >= 90) return '#00C851';
        return '#33b5e5';
    };

    return (
        <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '2rem',
            borderRadius: '15px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginTop: '2rem'
        }}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginTop: 0 }}>🍎 Daily Food Journal</h3>

            {/* Daily Summary Bars */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px' }}>
                        <span>Calories</span>
                        <span>{summary.calories} / {dailyGoals.calories} kcal</span>
                    </div>
                    <div style={{ height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min((summary.calories / dailyGoals.calories) * 100, 100)}%`,
                            height: '100%',
                            background: getProgressColor(summary.calories, dailyGoals.calories),
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Protein</div>
                        <div style={{ height: '6px', background: '#333', borderRadius: '3px', marginTop: '5px' }}>
                            <div style={{ width: `${Math.min((summary.protein / (dailyGoals.protein || 1)) * 100, 100)}%`, height: '100%', background: '#00C851' }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', textAlign: 'right' }}>{summary.protein}/{dailyGoals.protein}g</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Carbs</div>
                        <div style={{ height: '6px', background: '#333', borderRadius: '3px', marginTop: '5px' }}>
                            <div style={{ width: `${Math.min((summary.carbs / (dailyGoals.carbs || 1)) * 100, 100)}%`, height: '100%', background: '#ffbb33' }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', textAlign: 'right' }}>{summary.carbs}/{dailyGoals.carbs}g</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Fats</div>
                        <div style={{ height: '6px', background: '#333', borderRadius: '3px', marginTop: '5px' }}>
                            <div style={{ width: `${Math.min((summary.fats / (dailyGoals.fats || 1)) * 100, 100)}%`, height: '100%', background: '#ff4444' }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', textAlign: 'right' }}>{summary.fats}/{dailyGoals.fats}g</div>
                    </div>
                </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Search Food Database</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Type to search (e.g. 'Chicken', 'Rice')..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(0,0,0,0.2)',
                            color: 'white'
                        }}
                    />
                </div>

                {/* Dropdown Results */}
                {searchResults.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#1a1a20',
                        border: '1px solid #333',
                        borderRadius: '0 0 8px 8px',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                    }}>
                        {searchResults.map(food => (
                            <div
                                key={food.id}
                                onClick={() => handleSelectFood(food)}
                                style={{
                                    padding: '10px',
                                    borderBottom: '1px solid #333',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span>{food.name}</span>
                                <span style={{ color: '#888', fontSize: '0.9em' }}>
                                    {Math.round(food.calories)} kcal / {food.serving_size}{food.serving_unit}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected Item Editor */}
            {selectedFood && (
                <div style={{
                    background: 'rgba(0, 255, 255, 0.05)',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: '#00ffff' }}>{selectedFood.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                            {Math.round((selectedFood.calories * parseFloat(quantity || 0)) / selectedFood.serving_size)} kcal
                            {' • '}
                            P: {Math.round((selectedFood.proteins * parseFloat(quantity || 0)) / selectedFood.serving_size)}g
                            {' '}
                            C: {Math.round((selectedFood.carbs * parseFloat(quantity || 0)) / selectedFood.serving_size)}g
                            {' '}
                            F: {Math.round((selectedFood.fats * parseFloat(quantity || 0)) / selectedFood.serving_size)}g
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <label>Qty ({selectedFood.serving_unit})</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: 'white' }}
                        />
                    </div>
                    <button
                        onClick={logFood}
                        disabled={logging}
                        style={{
                            padding: '8px 16px',
                            background: '#00ffff',
                            color: 'black',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {logging ? 'Logging...' : 'Add Log'}
                    </button>
                    <button
                        onClick={() => setSelectedFood(null)}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            color: '#ccc',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Log List */}
            <h4 style={{ color: '#ccc', marginTop: 0 }}>Today's Logs</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {foods.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>No food logged today.</p>
                ) : (
                    foods.map(log => (
                        <div key={log.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)',
                            padding: '10px',
                            borderRadius: '5px',
                            marginBottom: '5px'
                        }}>
                            <div>
                                <strong>{log.food_name || 'Unknown Food'}</strong>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                    {log.serving_quantity}{log.serving_unit || 'g'} •
                                    {' Logged at ' + new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <button
                                onClick={() => removeFood(log.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ff4444',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NutritionCalculator;
