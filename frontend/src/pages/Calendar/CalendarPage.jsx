import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  Bell,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { tasksAPI, remindersAPI } from '../../services/api';

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [tasksRes, remindersRes] = await Promise.all([
          tasksAPI.getAll(),
          remindersAPI.getAll(),
        ]);

        if (!ignore) {
          if (tasksRes.data.success) {
            setTasks(tasksRes.data.data);
          }
          if (remindersRes.data.success) {
            setReminders(remindersRes.data.data);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Fetch calendar data error:', err);
          setError('Gagal memuat agenda kalender.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      await tasksAPI.update(taskId, { status: newStatus });
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  // Helper untuk filter data per tanggal
  const getTasksForDay = (day) => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      try {
        return isSameDay(parseISO(t.dueDate), day);
      } catch {
        return false;
      }
    });
  };

  const getRemindersForDay = (day) => {
    return reminders.filter((r) => {
      if (!r.remindAt) return false;
      try {
        return isSameDay(parseISO(r.remindAt), day);
      } catch {
        return false;
      }
    });
  };

  // Buat grid hari untuk kalender bulanan
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const selectedDayTasks = getTasksForDay(selectedDate);
  const selectedDayReminders = getRemindersForDay(selectedDate);

  if (loading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-card" style={{ height: '100px', marginBottom: '1.5rem' }}></div>
        <div className="skeleton skeleton-card" style={{ height: '450px' }}></div>
      </div>
    );
  }

  return (
    <div className="calendar-layout">
      {error && (
        <div className="alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Calendar Section */}
      <div className="calendar-main card">
        {/* Navigation & Month Title */}
        <div className="calendar-header">
          <div className="calendar-title-group">
            <h2 className="calendar-month-title">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <span className="text-muted text-sm">
              {tasks.length} total tugas, {reminders.length} pengingat
            </span>
          </div>

          <div className="calendar-controls">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleToday}
            >
              Hari Ini
            </button>
            <div className="calendar-nav-buttons">
              <button
                type="button"
                className="btn btn-secondary icon-btn"
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn btn-secondary icon-btn"
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="calendar-week-row">
          {weekDayHeaders.map((name, i) => (
            <div key={i} className="calendar-week-cell">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="calendar-grid">
          {calendarDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentToday = isToday(day);
            const dayTasks = getTasksForDay(day);
            const dayReminders = getRemindersForDay(day);
            const hasActivity = dayTasks.length > 0 || dayReminders.length > 0;

            let cellClass = 'calendar-day-cell';
            if (!isCurrentMonth) cellClass += ' out-of-month';
            if (isSelected) cellClass += ' selected';
            if (isCurrentToday) cellClass += ' today';

            return (
              <div
                key={idx}
                className={cellClass}
                onClick={() => setSelectedDate(day)}
              >
                <div className="calendar-day-top">
                  <span className={`calendar-day-number ${isCurrentToday ? 'today-pill' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {hasActivity && (
                    <span className="calendar-day-count">
                      {dayTasks.length + dayReminders.length}
                    </span>
                  )}
                </div>

                {/* Micro Badges for items */}
                <div className="calendar-day-items">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className={`cal-badge cal-badge-task ${
                        t.status === 'COMPLETED' ? 'completed' : ''
                      }`}
                      title={t.title}
                    >
                      <span className="badge-dot" />
                      <span className="badge-text">{t.title}</span>
                    </div>
                  ))}
                  {dayReminders.slice(0, 1).map((r) => (
                    <div
                      key={r.id}
                      className="cal-badge cal-badge-reminder"
                      title={r.title}
                    >
                      <Bell size={10} />
                      <span className="badge-text">{r.title}</span>
                    </div>
                  ))}
                  {dayTasks.length + dayReminders.length > 3 && (
                    <span className="cal-more">
                      +{dayTasks.length + dayReminders.length - 2} lainnya
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer / Panel */}
      <div className="calendar-sidebar card">
        <div className="agenda-header">
          <div className="agenda-date-badge">
            <CalendarIcon size={16} className="text-primary" />
            <span className="agenda-date-text">
              {format(selectedDate, 'EEEE, d MMMM yyyy')}
            </span>
          </div>
          {isToday(selectedDate) && (
            <span className="badge-status in-progress">Hari Ini</span>
          )}
        </div>

        {/* Selected Tasks */}
        <div className="agenda-section">
          <h4 className="agenda-section-title">
            <CheckSquare size={16} />
            <span>Tugas Jatuh Tempo ({selectedDayTasks.length})</span>
          </h4>

          {selectedDayTasks.length === 0 ? (
            <p className="agenda-empty">Tidak ada tugas pada tanggal ini.</p>
          ) : (
            <div className="agenda-list">
              {selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`agenda-item ${
                    task.status === 'COMPLETED' ? 'item-completed' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={task.status === 'COMPLETED'}
                    onChange={() => handleToggleTask(task.id, task.status)}
                  />
                  <div className="agenda-item-body">
                    <span className="agenda-item-title">{task.title}</span>
                    <span className={`badge-priority ${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Reminders */}
        <div className="agenda-section">
          <h4 className="agenda-section-title">
            <Bell size={16} />
            <span>Pengingat Jadwal ({selectedDayReminders.length})</span>
          </h4>

          {selectedDayReminders.length === 0 ? (
            <p className="agenda-empty">Tidak ada pengingat pada tanggal ini.</p>
          ) : (
            <div className="agenda-list">
              {selectedDayReminders.map((rem) => (
                <div key={rem.id} className="agenda-item reminder-item">
                  <Clock size={16} className="text-warning reminder-icon" />
                  <div className="agenda-item-body">
                    <span className="agenda-item-title">{rem.title}</span>
                    {rem.message && (
                      <span className="agenda-item-sub">{rem.message}</span>
                    )}
                    <span className="agenda-item-time">
                      {format(parseISO(rem.remindAt), 'HH:mm')} WIB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;

