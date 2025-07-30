class MoonEvent {
  title: string;
  date: Date;
  description?: string;
  link?: string;

  constructor(title: string, date: Date, description?: string, link?: string) {
    this.title = title;
    this.date = date;
    this.description = description;
    this.link = link;
  }
}

export default MoonEvent;
