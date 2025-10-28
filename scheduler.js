// Data Models
class ClassItem {
    constructor(id, name, title, instructor, enrollment, duration = 1) {
        this.id = id;
        this.name = name;
        this.title = title;
        this.instructor = instructor;
        this.enrollment = enrollment;
        this.duration = duration; // How many time blocks this class spans
    }
}

class ScheduleConfig {
    constructor() {
        this.rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Lab A', 'Lab B'];
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        this.timeBlocks = [
            '8:00 AM - 9:15 AM',
            '9:30 AM - 10:45 AM',
            '11:00 AM - 12:15 PM',
            '12:30 PM - 1:45 PM',
            '2:00 PM - 3:15 PM',
            '3:30 PM - 4:45 PM'
        ];
    }
}

// Main Scheduler Application
class Scheduler {
    constructor() {
        this.config = new ScheduleConfig();
        this.classes = [];
        this.schedule = {}; // Map of slot IDs to class IDs
        this.nextClassId = 1;
        this.draggedElement = null;
        this.draggedClassId = null;

        this.init();
    }

    init() {
        // Add some sample classes
        this.addSampleClasses();

        // Setup event listeners
        this.setupEventListeners();

        // Render the UI
        this.renderScheduleGrid();
        this.renderUnassignedClasses();

        // Load saved data if exists
        this.loadFromLocalStorage();
    }

    addSampleClasses() {
        this.addClass(new ClassItem(this.nextClassId++, 'CSCI 101', 'Intro to Computer Science', 'Dr. Smith', 35));
        this.addClass(new ClassItem(this.nextClassId++, 'CSCI 201', 'Data Structures', 'Dr. Johnson', 30));
        this.addClass(new ClassItem(this.nextClassId++, 'CSCI 301', 'Algorithms', 'Prof. Williams', 25));
        this.addClass(new ClassItem(this.nextClassId++, 'CSCI 350', 'Operating Systems', 'Dr. Brown', 28));
        this.addClass(new ClassItem(this.nextClassId++, 'CSCI 401', 'Software Engineering', 'Prof. Davis', 32));
        this.addClass(new ClassItem(this.nextClassId++, 'CSCI 450', 'Database Systems', 'Dr. Miller', 30));
    }

    setupEventListeners() {
        // Add Class button
        document.getElementById('addClassBtn').addEventListener('click', () => {
            this.showModal('addClassModal');
        });

        // Configure button
        document.getElementById('configBtn').addEventListener('click', () => {
            this.showConfigModal();
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveToLocalStorage();
            alert('Schedule saved successfully!');
        });

        // Load button
        document.getElementById('loadBtn').addEventListener('click', () => {
            this.loadFromLocalStorage();
            alert('Schedule loaded successfully!');
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToJSON();
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the entire schedule? This cannot be undone.')) {
                this.clearSchedule();
            }
        });

        // Add class form
        document.getElementById('addClassForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddClass();
        });

        // Config form
        document.getElementById('configForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleConfigUpdate();
        });

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    addClass(classItem) {
        this.classes.push(classItem);
    }

    removeClass(classId) {
        // Remove from classes array
        this.classes = this.classes.filter(c => c.id !== classId);

        // Remove from schedule
        for (let slotId in this.schedule) {
            if (this.schedule[slotId] === classId) {
                delete this.schedule[slotId];
            }
        }

        this.renderScheduleGrid();
        this.renderUnassignedClasses();
    }

    getClassById(classId) {
        return this.classes.find(c => c.id === classId);
    }

    isClassScheduled(classId) {
        return Object.values(this.schedule).includes(classId);
    }

    getSlotKey(room, day, timeBlock) {
        return `${room}|${day}|${timeBlock}`;
    }

    assignClassToSlot(classId, room, day, timeBlock) {
        const slotKey = this.getSlotKey(room, day, timeBlock);
        this.schedule[slotKey] = classId;
    }

    removeClassFromSlot(room, day, timeBlock) {
        const slotKey = this.getSlotKey(room, day, timeBlock);
        delete this.schedule[slotKey];
    }

    getClassInSlot(room, day, timeBlock) {
        const slotKey = this.getSlotKey(room, day, timeBlock);
        const classId = this.schedule[slotKey];
        return classId ? this.getClassById(classId) : null;
    }

    renderScheduleGrid() {
        const gridContainer = document.getElementById('scheduleGrid');
        gridContainer.innerHTML = '';

        // Create table for each room
        this.config.rooms.forEach(room => {
            const roomSection = document.createElement('div');
            roomSection.className = 'room-section';

            const table = document.createElement('table');
            table.className = 'grid-table';

            // Room header
            const roomHeaderRow = document.createElement('tr');
            const roomHeaderCell = document.createElement('th');
            roomHeaderCell.className = 'room-header';
            roomHeaderCell.colSpan = this.config.days.length + 1;
            roomHeaderCell.textContent = room;
            roomHeaderRow.appendChild(roomHeaderCell);
            table.appendChild(roomHeaderRow);

            // Days header row
            const daysHeaderRow = document.createElement('tr');
            const emptyCell = document.createElement('th');
            emptyCell.className = 'time-header';
            emptyCell.textContent = 'Time';
            daysHeaderRow.appendChild(emptyCell);

            this.config.days.forEach(day => {
                const dayCell = document.createElement('th');
                dayCell.className = 'day-header';
                dayCell.textContent = day;
                daysHeaderRow.appendChild(dayCell);
            });
            table.appendChild(daysHeaderRow);

            // Time blocks rows
            this.config.timeBlocks.forEach(timeBlock => {
                const row = document.createElement('tr');

                // Time label
                const timeCell = document.createElement('th');
                timeCell.className = 'time-header';
                timeCell.textContent = timeBlock;
                row.appendChild(timeCell);

                // Day slots
                this.config.days.forEach(day => {
                    const slot = document.createElement('td');
                    slot.className = 'time-slot';
                    slot.dataset.room = room;
                    slot.dataset.day = day;
                    slot.dataset.timeBlock = timeBlock;

                    // Check if there's a class scheduled
                    const scheduledClass = this.getClassInSlot(room, day, timeBlock);
                    if (scheduledClass) {
                        slot.classList.add('occupied');
                        const classDiv = this.createScheduledClassElement(scheduledClass);
                        slot.appendChild(classDiv);
                    }

                    // Make slot a drop target
                    this.makeDropTarget(slot);

                    row.appendChild(slot);
                });

                table.appendChild(row);
            });

            roomSection.appendChild(table);
            gridContainer.appendChild(roomSection);
        });
    }

    createScheduledClassElement(classItem) {
        const div = document.createElement('div');
        div.className = 'slot-class';
        div.draggable = true;
        div.dataset.classId = classItem.id;

        div.innerHTML = `
            <h4>${classItem.name}</h4>
            <p>${classItem.instructor}</p>
            <p>${classItem.enrollment} students</p>
        `;

        // Make it draggable
        this.makeDraggable(div);

        return div;
    }

    renderUnassignedClasses() {
        const container = document.getElementById('unassignedClasses');
        container.innerHTML = '';

        const unassignedClasses = this.classes.filter(c => !this.isClassScheduled(c.id));

        if (unassignedClasses.length === 0) {
            container.innerHTML = '<p class="empty-state">All classes are scheduled!</p>';
            return;
        }

        unassignedClasses.forEach(classItem => {
            const card = this.createClassCard(classItem);
            container.appendChild(card);
        });
    }

    createClassCard(classItem) {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.draggable = true;
        card.dataset.classId = classItem.id;

        card.innerHTML = `
            <h3>${classItem.name}</h3>
            <div class="class-title">${classItem.title}</div>
            <div class="instructor">${classItem.instructor}</div>
            <div class="enrollment">${classItem.enrollment} students</div>
            <button class="remove-btn" onclick="scheduler.removeClass(${classItem.id})">Remove</button>
        `;

        // Make it draggable
        this.makeDraggable(card);

        return card;
    }

    makeDraggable(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedElement = element;
            this.draggedClassId = parseInt(element.dataset.classId);
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', element.innerHTML);
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            this.draggedElement = null;
        });
    }

    makeDropTarget(slot) {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', (e) => {
            slot.classList.remove('drag-over');
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');

            if (!this.draggedClassId) return;

            const room = slot.dataset.room;
            const day = slot.dataset.day;
            const timeBlock = slot.dataset.timeBlock;

            // Check if slot is already occupied
            const existingClass = this.getClassInSlot(room, day, timeBlock);
            if (existingClass && existingClass.id !== this.draggedClassId) {
                alert('This slot is already occupied! Please choose another slot or remove the existing class first.');
                return;
            }

            // Remove class from previous slot if it was scheduled
            for (let slotId in this.schedule) {
                if (this.schedule[slotId] === this.draggedClassId) {
                    delete this.schedule[slotId];
                }
            }

            // Assign to new slot
            this.assignClassToSlot(this.draggedClassId, room, day, timeBlock);

            // Re-render
            this.renderScheduleGrid();
            this.renderUnassignedClasses();

            this.draggedClassId = null;
        });
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    showConfigModal() {
        // Populate current config
        document.getElementById('rooms').value = this.config.rooms.join('\n');
        document.getElementById('days').value = this.config.days.join('\n');
        document.getElementById('timeBlocks').value = this.config.timeBlocks.join('\n');

        this.showModal('configModal');
    }

    handleAddClass() {
        const name = document.getElementById('className').value.trim();
        const title = document.getElementById('classTitle').value.trim();
        const instructor = document.getElementById('instructor').value.trim();
        const enrollment = parseInt(document.getElementById('enrollment').value);
        const duration = parseInt(document.getElementById('duration').value);

        if (!name || !title || !instructor) {
            alert('Please fill in all required fields');
            return;
        }

        const newClass = new ClassItem(this.nextClassId++, name, title, instructor, enrollment, duration);
        this.addClass(newClass);

        // Close modal and reset form
        document.getElementById('addClassModal').style.display = 'none';
        document.getElementById('addClassForm').reset();

        // Re-render
        this.renderUnassignedClasses();
    }

    handleConfigUpdate() {
        const roomsText = document.getElementById('rooms').value.trim();
        const daysText = document.getElementById('days').value.trim();
        const timeBlocksText = document.getElementById('timeBlocks').value.trim();

        if (!roomsText || !daysText || !timeBlocksText) {
            alert('Please fill in all configuration fields');
            return;
        }

        // Update config
        this.config.rooms = roomsText.split('\n').map(r => r.trim()).filter(r => r);
        this.config.days = daysText.split('\n').map(d => d.trim()).filter(d => d);
        this.config.timeBlocks = timeBlocksText.split('\n').map(t => t.trim()).filter(t => t);

        // Close modal
        document.getElementById('configModal').style.display = 'none';

        // Clear schedule (since the structure changed)
        if (Object.keys(this.schedule).length > 0) {
            if (confirm('Changing configuration will clear the current schedule. Continue?')) {
                this.schedule = {};
            } else {
                return;
            }
        }

        // Re-render
        this.renderScheduleGrid();
        this.renderUnassignedClasses();
    }

    clearSchedule() {
        this.schedule = {};
        this.renderScheduleGrid();
        this.renderUnassignedClasses();
    }

    saveToLocalStorage() {
        const data = {
            config: this.config,
            classes: this.classes,
            schedule: this.schedule,
            nextClassId: this.nextClassId
        };
        localStorage.setItem('scheduleData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const savedData = localStorage.getItem('scheduleData');
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            this.config = data.config;
            this.classes = data.classes.map(c => new ClassItem(c.id, c.name, c.title, c.instructor, c.enrollment, c.duration));
            this.schedule = data.schedule;
            this.nextClassId = data.nextClassId;

            this.renderScheduleGrid();
            this.renderUnassignedClasses();
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }

    exportToJSON() {
        const exportData = {
            config: this.config,
            classes: this.classes,
            schedule: this.schedule,
            exportDate: new Date().toISOString()
        };

        // Convert schedule to readable format
        const readableSchedule = [];
        for (let slotKey in this.schedule) {
            const [room, day, timeBlock] = slotKey.split('|');
            const classItem = this.getClassById(this.schedule[slotKey]);
            if (classItem) {
                readableSchedule.push({
                    room,
                    day,
                    timeBlock,
                    class: {
                        name: classItem.name,
                        title: classItem.title,
                        instructor: classItem.instructor,
                        enrollment: classItem.enrollment
                    }
                });
            }
        }
        exportData.readableSchedule = readableSchedule;

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `schedule-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Initialize the scheduler when DOM is loaded
let scheduler;
document.addEventListener('DOMContentLoaded', () => {
    scheduler = new Scheduler();
});
