export const formatDate = (date: Date) => {
  if (!date) return "";
  return date.toDateString();
};
