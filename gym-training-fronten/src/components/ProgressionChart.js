import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const ProgressionChart = ({ data, title }) => {
    if (!data || data.length === 0) {
        return (
            <div className="chart-container" style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '15px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                color: 'var(--gray)'
            }}>
                <p>No data available for this exercise yet.</p>
            </div>
        );
    }

    // Format dates for X-Axis
    const formattedData = data.map(item => ({
        ...item,
        formattedDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip" style={{
                    background: 'rgba(10, 10, 15, 0.9)',
                    border: '1px solid var(--primary)',
                    padding: '1rem',
                    borderRadius: '10px',
                    boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
                }}>
                    <p style={{ color: 'var(--light)', marginBottom: '0.5rem', fontWeight: 'bold' }}>{label}</p>
                    <p style={{ color: 'var(--primary)' }}>
                        1RM: {payload[0].value} kg
                    </p>
                    <p style={{ color: 'var(--secondary)' }}>
                        Weight: {payload[0].payload.weight} kg
                    </p>
                    <p style={{ color: 'var(--gray)' }}>
                        Reps: {payload[0].payload.reps}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="chart-wrapper" style={{ width: '100%', height: 400, marginTop: '2rem' }}>
            <h3 style={{
                color: 'var(--light)',
                marginBottom: '1rem',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                {title} <span style={{ color: 'var(--primary)', fontSize: '0.8em' }}>(Estimated 1RM)</span>
            </h3>

            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={formattedData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                        dataKey="formattedDate"
                        stroke="var(--gray)"
                        tick={{ fill: 'var(--gray)' }}
                    />
                    <YAxis
                        stroke="var(--gray)"
                        tick={{ fill: 'var(--gray)' }}
                        label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', fill: 'var(--gray)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="oneRepMax"
                        name="1 Rep Max (Est)"
                        stroke="var(--primary)"
                        strokeWidth={3}
                        dot={{ fill: 'var(--dark)', stroke: 'var(--primary)', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 8, fill: 'var(--primary)', stroke: 'var(--light)' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProgressionChart;
