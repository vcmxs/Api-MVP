import React, { useState } from 'react';

const Calendar = ({ events = [], onSelectDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        onSelectDate(selectedDate);
    };

    const renderDays = () => {
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const hasEvent = events.some(e => {
                const eventDate = new Date(e.scheduledDate || e.date);
                return eventDate.getDate() === day &&
                    eventDate.getMonth() === currentDate.getMonth() &&
                    eventDate.getFullYear() === currentDate.getFullYear();
            });

            // Allow multiple event dots if needed, for now just a simple indicator
            // Or distinguish colors (Personal vs Trainee)

            days.push(
                <div
                    key={day}
                    className={`calendar-day ${hasEvent ? 'has-event' : ''}`}
                    onClick={() => handleDateClick(day)}
                >
                    <span className="day-number">{day}</span>
                    {hasEvent && <div className="event-dot"></div>}
                </div>
            );
        }

        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <button onClick={prevMonth} className="btn-icon">❮</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={nextMonth} className="btn-icon">❯</button>
            </div>
            <div className="calendar-weekdays">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
            </div>
            <div className="calendar-grid">
                {renderDays()}
            </div>
        </div>
    );
};

export default Calendar;
