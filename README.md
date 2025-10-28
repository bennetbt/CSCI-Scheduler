# College Class Scheduler

A web-based drag-and-drop interface for scheduling classes across rooms, days, and time blocks for a large college department.

## Features

- **Drag-and-Drop Interface**: Easily move classes between time slots by dragging and dropping
- **Flexible Configuration**: Customize rooms, days, and time blocks to match your department's needs
- **Class Management**: Add, remove, and track classes with instructor and enrollment information
- **Visual Scheduling Grid**: Clear overview of all rooms, days, and time slots
- **Persistent Storage**: Save and load schedules using browser local storage
- **JSON Export**: Export schedules to JSON format for backup or sharing
- **Responsive Design**: Works on desktop and tablet devices

## Getting Started

### Installation

Simply open the `index.html` file in a modern web browser. No server or installation required!

```bash
# Clone or download this repository
# Then open index.html in your browser
open index.html
```

## Usage

### Basic Workflow

1. **View the Schedule Grid**: The main area shows a table for each room with days as columns and time blocks as rows
2. **See Unassigned Classes**: The left sidebar shows all classes that haven't been scheduled yet
3. **Drag and Drop**: Click and drag a class from the sidebar or from one time slot to another
4. **Save Your Work**: Click the "Save Schedule" button to save to browser storage

### Adding Classes

1. Click the **"Add Class"** button in the header
2. Fill in the class details:
   - Class Name (e.g., CSCI 101)
   - Class Title (e.g., Introduction to Computer Science)
   - Instructor name
   - Expected enrollment
   - Duration (number of time blocks)
3. Click **"Add Class"** to add it to the unassigned classes pool

### Configuring Rooms and Time Blocks

1. Click the **"Configure Rooms/Times"** button
2. Edit the configuration:
   - **Rooms**: One room per line (e.g., Room 101, Lab A, etc.)
   - **Days**: One day per line (e.g., Monday, Tuesday, etc.)
   - **Time Blocks**: One time block per line (e.g., 8:00 AM - 9:15 AM)
3. Click **"Apply Configuration"**
   - Note: This will clear the current schedule if you have classes already scheduled

### Managing Your Schedule

- **Save**: Saves the current schedule to browser local storage
- **Load**: Loads a previously saved schedule from local storage
- **Export to JSON**: Downloads the schedule as a JSON file
- **Clear All**: Removes all scheduled classes (keeps the class list)
- **Remove Class**: Click the "Remove" button on any class card to delete it entirely

### Scheduling Classes

1. **From Sidebar**: Drag any unassigned class from the left sidebar to an empty time slot
2. **Between Slots**: Drag a scheduled class from one time slot to another
3. **Back to Unassigned**: Drag a class from a time slot back to the sidebar to unschedule it

### Visual Feedback

- **Empty Slots**: Light gray background, hover to see interaction
- **Occupied Slots**: Yellow background with class information displayed
- **Drag Over**: Green dashed border appears when dragging over a valid drop target
- **Dragging**: Class card becomes semi-transparent while being dragged

## Default Configuration

The scheduler comes pre-configured with:

### Sample Classes
- CSCI 101 - Intro to Computer Science (Dr. Smith, 35 students)
- CSCI 201 - Data Structures (Dr. Johnson, 30 students)
- CSCI 301 - Algorithms (Prof. Williams, 25 students)
- CSCI 350 - Operating Systems (Dr. Brown, 28 students)
- CSCI 401 - Software Engineering (Prof. Davis, 32 students)
- CSCI 450 - Database Systems (Dr. Miller, 30 students)

### Default Rooms
- Room 101, Room 102, Room 103, Room 104
- Lab A, Lab B

### Default Days
- Monday through Friday

### Default Time Blocks
- 8:00 AM - 9:15 AM
- 9:30 AM - 10:45 AM
- 11:00 AM - 12:15 PM
- 12:30 PM - 1:45 PM
- 2:00 PM - 3:15 PM
- 3:30 PM - 4:45 PM

## Technical Details

### Files Structure

```
CSCI-Scheduler/
├── index.html       # Main HTML structure
├── styles.css       # All styling and layout
├── scheduler.js     # JavaScript logic and functionality
└── README.md        # This file
```

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

The application uses:
- HTML5 Drag and Drop API
- CSS Grid and Flexbox
- ES6 JavaScript classes
- LocalStorage API

### Data Storage

The application stores data in browser `localStorage` with the key `scheduleData`. The data structure includes:
- Configuration (rooms, days, time blocks)
- Class list with all details
- Schedule mapping (which class is in which slot)

## Tips for Large Departments

1. **Start with Configuration**: Set up all your rooms and time blocks first
2. **Add All Classes**: Input all classes before starting to schedule
3. **Save Frequently**: Use the Save button regularly to prevent data loss
4. **Export Backups**: Periodically export to JSON as a backup
5. **Use Descriptive Names**: Include course codes and instructor names for clarity

## Limitations

- No conflict detection (you can manually schedule overlapping classes for instructors)
- No room capacity validation
- No automatic scheduling optimization
- Data is stored locally (not synchronized across devices)

## Future Enhancements

Potential features for future development:
- Conflict detection (same instructor, same time)
- Room capacity validation
- Auto-scheduling algorithm
- Multi-day recurring classes
- Print-friendly view
- Import from CSV
- Backend database support
- Multi-user collaboration

## License

This is a simple scheduling tool created for educational purposes.

## Support

For issues or questions, please refer to the documentation or modify the code to suit your needs.
