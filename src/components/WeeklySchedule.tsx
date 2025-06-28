import React, { useState } from 'react';
import { Calendar, Clock, Star } from 'lucide-react';
import { Movie, WeekDay } from '../types';
import MovieCard from './MovieCard';

interface WeeklyScheduleProps {
  movies: Movie[];
  onPlayMovie: (movie: Movie) => void;
  onShowDetails: (movie: Movie) => void;
}

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ movies, onPlayMovie, onShowDetails }) => {
  const [selectedDay, setSelectedDay] = useState<WeekDay>('monday');

  const weekDays: { key: WeekDay; label: string; shortLabel: string }[] = [
    { key: 'monday', label: 'Thứ Hai', shortLabel: 'T2' },
    { key: 'tuesday', label: 'Thứ Ba', shortLabel: 'T3' },
    { key: 'wednesday', label: 'Thứ Tư', shortLabel: 'T4' },
    { key: 'thursday', label: 'Thứ Năm', shortLabel: 'T5' },
    { key: 'friday', label: 'Thứ Sáu', shortLabel: 'T6' },
    { key: 'saturday', label: 'Thứ Bảy', shortLabel: 'T7' },
    { key: 'sunday', label: 'Chủ Nhật', shortLabel: 'CN' }
  ];

  const getMoviesForDay = (day: WeekDay) => {
    return movies.filter(movie => movie.airDay === day).sort((a, b) => {
      if (a.airTime && b.airTime) {
        return a.airTime.localeCompare(b.airTime);
      }
      return 0;
    });
  };

  const selectedDayMovies = getMoviesForDay(selectedDay);
  const selectedDayLabel = weekDays.find(day => day.key === selectedDay)?.label || '';

  const getCurrentDay = (): WeekDay => {
    const today = new Date().getDay();
    const dayMap: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayMap[today];
  };

  const isToday = (day: WeekDay) => getCurrentDay() === day;

  return (
    <section className="mb-12">
      <div className="flex items-center space-x-3 mb-6">
        <Calendar className="h-8 w-8 text-blue-400" />
        <h2 className="text-3xl font-bold text-white">Lịch Phát Sóng Trong Tuần 📅</h2>
      </div>

      {/* Day Selector */}
      <div className="mb-8">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {weekDays.map((day) => {
            const dayMovies = getMoviesForDay(day.key);
            const hasMovies = dayMovies.length > 0;
            
            return (
              <button
                key={day.key}
                onClick={() => setSelectedDay(day.key)}
                className={`relative flex-shrink-0 px-6 py-4 rounded-xl font-semibold transition-all duration-300 min-w-[120px] ${
                  selectedDay === day.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : hasMovies
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'bg-gray-900 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!hasMovies}
              >
                <div className="text-center">
                  <div className="text-lg font-bold">{day.shortLabel}</div>
                  <div className="text-sm opacity-80">{day.label}</div>
                  {hasMovies && (
                    <div className="text-xs mt-1 opacity-70">
                      {dayMovies.length} phim
                    </div>
                  )}
                </div>
                
                {/* Today indicator */}
                {isToday(day.key) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
                
                {/* Movie count badge */}
                {hasMovies && selectedDay !== day.key && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                    {dayMovies.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Content */}
      <div className="bg-gray-800/30 rounded-2xl p-6 backdrop-blur-sm border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>{selectedDayLabel}</span>
            {isToday(selectedDay) && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                Hôm nay
              </span>
            )}
          </h3>
          <div className="text-gray-400 text-sm">
            {selectedDayMovies.length} phim được phát sóng
          </div>
        </div>

        {selectedDayMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {selectedDayMovies.map((movie) => (
              <div key={movie.id} className="relative">
                <div onClick={() => onShowDetails(movie)} className="cursor-pointer">
                  <MovieCard
                    movie={movie}
                    onPlay={onPlayMovie}
                    onShowDetails={onShowDetails}
                  />
                </div>
                {/* Air time overlay */}
                <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold z-10">
                  {movie.airTime}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">
              Không có phim nào được phát sóng vào {selectedDayLabel}
            </div>
            <p className="text-gray-500 text-sm">
              Hãy chọn ngày khác để xem lịch phát sóng
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default WeeklySchedule;