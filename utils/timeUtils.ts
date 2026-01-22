
/**
 * Logic for time calculation, timezones, and duration.
 */

export const formatTime = (isoString: string | null): string => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export const formatDate = (isoString: string | Date): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('uk-UA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const calculateDuration = (startIso: string, endIso: string | null): string => {
  if (!startIso) return '0г 0хв';
  
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : new Date().getTime(); // If active, calc vs now
  
  const diffMs = end - start;
  
  if (diffMs < 0) return '0г 0хв';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}г ${minutes}хв`;
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Доброї ночі';
  if (hour < 12) return 'Доброго ранку';
  if (hour < 18) return 'Доброго дня';
  return 'Доброго вечора';
};

/**
 * Gets the current local ISO string handling offset issues purely for display
 */
export const getLocalISOString = () => {
  return new Date().toISOString();
};
