export const recurringSlots = [
  {
    id: "monday-5",
    dayKey: "monday",
    dayLabel: "Monday",
    timeLabel: "5:00 PM",
    timeWindowLabel: "5:00 PM–5:45 PM",
    locationLabel: "Snyder Courts",
    sortOrder: 1,
    capacity: 6
  },
  {
    id: "monday-6",
    dayKey: "monday",
    dayLabel: "Monday",
    timeLabel: "6:00 PM",
    timeWindowLabel: "6:00 PM–6:45 PM",
    locationLabel: "Perry Courts",
    sortOrder: 2,
    capacity: 6
  },
  {
    id: "tuesday-5",
    dayKey: "tuesday",
    dayLabel: "Tuesday",
    timeLabel: "5:00 PM",
    timeWindowLabel: "5:00 PM–5:45 PM",
    locationLabel: "Snyder Courts",
    sortOrder: 3,
    capacity: 6
  },
  {
    id: "tuesday-6",
    dayKey: "tuesday",
    dayLabel: "Tuesday",
    timeLabel: "6:00 PM",
    timeWindowLabel: "6:00 PM–6:45 PM",
    locationLabel: "Perry Courts",
    sortOrder: 4,
    capacity: 6
  },
  {
    id: "wednesday-5",
    dayKey: "wednesday",
    dayLabel: "Wednesday",
    timeLabel: "5:00 PM",
    timeWindowLabel: "5:00 PM–5:45 PM",
    locationLabel: "Snyder Courts",
    sortOrder: 5,
    capacity: 6
  },
  {
    id: "wednesday-6",
    dayKey: "wednesday",
    dayLabel: "Wednesday",
    timeLabel: "6:00 PM",
    timeWindowLabel: "6:00 PM–6:45 PM",
    locationLabel: "Perry Courts",
    sortOrder: 6,
    capacity: 6
  }
] as const;

export const totalLeagueTeamCapacity = recurringSlots.reduce((total, slot) => total + slot.capacity, 0);
