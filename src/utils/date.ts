export const formatDate = (date: Date | null | undefined): string => {
  if (!date) return "";
  return date.toDateString();
};
