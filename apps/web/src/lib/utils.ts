export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: Date, format: string = "MMM dd, yyyy"): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const weekday = date.getDay();

  const pad = (n: number) => n.toString().padStart(2, "0");

  return format
    .replace("yyyy", year.toString())
    .replace("yy", year.toString().slice(-2))
    .replace("MMMM", months[month])
    .replace("MMM", shortMonths[month])
    .replace("MM", pad(month + 1))
    .replace("dd", pad(day))
    .replace("d", day.toString())
    .replace("EEEE", days[weekday])
    .replace("EEE", shortDays[weekday]);
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
