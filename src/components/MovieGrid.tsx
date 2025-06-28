import React from 'react';
import { Movie } from '../types';
import MovieCard from './MovieCard';

interface MovieGridProps {
  title: string;
  movies: Movie[];
  onPlayMovie: (movie: Movie) => void;
  onShowDetails: (movie: Movie) => void;
}

const MovieGrid: React.FC<MovieGridProps> = ({ title, movies, onPlayMovie, onShowDetails }) => {
  if (movies.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onPlay={onPlayMovie}
            onShowDetails={onShowDetails}
          />
        ))}
      </div>
    </section>
  );
};

export default MovieGrid;