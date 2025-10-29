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
        this.roomOrder = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Lab A', 'Lab B']; // Order of columns
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        // Time blocks per day - each day can have different time blocks
        this.timeBlocksByDay = {
            'Monday': [
                '8:00 AM - 9:15 AM',
                '9:30 AM - 10:45 AM',
                '11:00 AM - 12:15 PM',
                '12:30 PM - 1:45 PM',
                '2:00 PM - 3:15 PM',
                '3:30 PM - 4:45 PM'
            ],
            'Tuesday': [
                '8:00 AM - 9:15 AM',
                '9:30 AM - 10:45 AM',
                '11:00 AM - 12:15 PM',
                '12:30 PM - 1:45 PM',
                '2:00 PM - 3:15 PM',
                '3:30 PM - 4:45 PM'
            ],
            'Wednesday': [
                '8:00 AM - 9:15 AM',
                '9:30 AM - 10:45 AM',
                '11:00 AM - 12:15 PM',
                '12:30 PM - 1:45 PM',
                '2:00 PM - 3:15 PM',
                '3:30 PM - 4:45 PM'
            ],
            'Thursday': [
                '8:00 AM - 9:15 AM',
                '9:30 AM - 10:45 AM',
                '11:00 AM - 12:15 PM',
                '12:30 PM - 1:45 PM',
                '2:00 PM - 3:15 PM',
                '3:30 PM - 4:45 PM'
            ],
            'Friday': [
                '8:00 AM - 9:15 AM',
                '9:30 AM - 10:45 AM',
                '11:00 AM - 12:15 PM',
                '12:30 PM - 1:45 PM',
                '2:00 PM - 3:15 PM',
                '3:30 PM - 4:45 PM'
            ]
        };
    }

    getTimeBlocksForDay(day) {
        return this.timeBlocksByDay[day] || [];
    }

    getAllUniqueTimeBlocks() {
        const allBlocks = new Set();
        for (let day of this.days) {
            const blocks = this.getTimeBlocksForDay(day);
            blocks.forEach(block => allBlocks.add(block));
        }
        return Array.from(allBlocks);
    }

    // Move a room left in the order
    moveRoomLeft(room) {
        const index = this.roomOrder.indexOf(room);
        if (index > 0) {
            [this.roomOrder[index], this.roomOrder[index - 1]] =
            [this.roomOrder[index - 1], this.roomOrder[index]];
            return true;
        }
        return false;
    }

    // Move a room right in the order
    moveRoomRight(room) {
        const index = this.roomOrder.indexOf(room);
        if (index < this.roomOrder.length - 1) {
            [this.roomOrder[index], this.roomOrder[index + 1]] =
            [this.roomOrder[index + 1], this.roomOrder[index]];
            return true;
        }
        return false;
    }

    // Update room order based on new rooms list
    updateRoomOrder() {
        // Keep existing order for rooms that still exist
        const newOrder = this.roomOrder.filter(room => this.rooms.includes(room));

        // Add any new rooms to the end
        this.rooms.forEach(room => {
            if (!newOrder.includes(room)) {
                newOrder.push(room);
            }
        });

        this.roomOrder = newOrder;
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
        this.editingClassId = null; // Track which class is being edited

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

        // Load saved data from server
        this.loadFromServer();
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

        // Reports button
        document.getElementById('reportsBtn').addEventListener('click', () => {
            this.showReportsModal();
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveToServer();
        });

        // Load button
        document.getElementById('loadBtn').addEventListener('click', () => {
            this.loadFromServer();
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
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';

                // Reset edit mode if closing the add/edit class modal
                if (modal.id === 'addClassModal') {
                    this.resetAddClassModal();
                }
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';

                // Reset edit mode if closing the add/edit class modal
                if (e.target.id === 'addClassModal') {
                    this.resetAddClassModal();
                }
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

    checkFacultyConflict(instructor, day, timeBlock, excludeClassId = null) {
        // Skip conflict check for TBD instructors (unassigned)
        if (!instructor || instructor === 'TBD') {
            return { conflict: false };
        }

        // Check if this instructor is already teaching at this time on this day
        for (let slotKey in this.schedule) {
            const [room, slotDay, slotTime] = slotKey.split('|');

            // Check if it's the same day and time block
            if (slotDay === day && slotTime === timeBlock) {
                const classId = this.schedule[slotKey];

                // Skip if this is the same class we're moving
                if (classId === excludeClassId) continue;

                const classItem = this.getClassById(classId);
                if (classItem && classItem.instructor === instructor && classItem.instructor !== 'TBD') {
                    return {
                        conflict: true,
                        conflictingClass: classItem,
                        conflictingRoom: room
                    };
                }
            }
        }
        return { conflict: false };
    }

    getFacultySchedule(instructor) {
        // Get all scheduled slots for a given instructor
        const schedule = [];
        for (let slotKey in this.schedule) {
            const [room, day, timeBlock] = slotKey.split('|');
            const classId = this.schedule[slotKey];
            const classItem = this.getClassById(classId);

            if (classItem && classItem.instructor === instructor) {
                schedule.push({
                    class: classItem,
                    room,
                    day,
                    timeBlock
                });
            }
        }
        return schedule;
    }

    renderScheduleGrid() {
        const gridContainer = document.getElementById('scheduleGrid');
        gridContainer.innerHTML = '';

        // Create table for each day
        this.config.days.forEach(day => {
            const daySection = document.createElement('div');
            daySection.className = 'day-section';

            const table = document.createElement('table');
            table.className = 'grid-table';

            // Day header
            const dayHeaderRow = document.createElement('tr');
            const dayHeaderCell = document.createElement('th');
            dayHeaderCell.className = 'day-header-main';
            dayHeaderCell.colSpan = this.config.roomOrder.length + 1;
            dayHeaderCell.textContent = day;
            dayHeaderRow.appendChild(dayHeaderCell);
            table.appendChild(dayHeaderRow);

            // Room headers row with reorder buttons
            const roomHeaderRow = document.createElement('tr');
            const emptyCell = document.createElement('th');
            emptyCell.className = 'time-header';
            emptyCell.textContent = 'Time';
            roomHeaderRow.appendChild(emptyCell);

            this.config.roomOrder.forEach((room, index) => {
                const roomCell = document.createElement('th');
                roomCell.className = 'room-header';

                // Room name
                const roomName = document.createElement('div');
                roomName.textContent = room;
                roomName.style.marginBottom = '0.3rem';
                roomCell.appendChild(roomName);

                // Reorder buttons
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'reorder-buttons';

                const leftBtn = document.createElement('button');
                leftBtn.innerHTML = '←';
                leftBtn.className = 'reorder-btn';
                leftBtn.title = 'Move left';
                leftBtn.disabled = index === 0;
                leftBtn.onclick = () => this.moveRoomColumn(room, 'left');

                const rightBtn = document.createElement('button');
                rightBtn.innerHTML = '→';
                rightBtn.className = 'reorder-btn';
                rightBtn.title = 'Move right';
                rightBtn.disabled = index === this.config.roomOrder.length - 1;
                rightBtn.onclick = () => this.moveRoomColumn(room, 'right');

                buttonContainer.appendChild(leftBtn);
                buttonContainer.appendChild(rightBtn);
                roomCell.appendChild(buttonContainer);

                roomHeaderRow.appendChild(roomCell);
            });
            table.appendChild(roomHeaderRow);

            // Time blocks rows for this specific day
            const timeBlocks = this.config.getTimeBlocksForDay(day);
            timeBlocks.forEach(timeBlock => {
                const row = document.createElement('tr');

                // Time label
                const timeCell = document.createElement('th');
                timeCell.className = 'time-header';
                timeCell.textContent = timeBlock;
                row.appendChild(timeCell);

                // Room slots (in the configured order)
                this.config.roomOrder.forEach(room => {
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

            daySection.appendChild(table);
            gridContainer.appendChild(daySection);
        });
    }

    moveRoomColumn(room, direction) {
        let moved = false;
        if (direction === 'left') {
            moved = this.config.moveRoomLeft(room);
        } else if (direction === 'right') {
            moved = this.config.moveRoomRight(room);
        }

        if (moved) {
            this.renderScheduleGrid();
            // Auto-save the new order
            this.saveToServer();
        }
    }

    createScheduledClassElement(classItem) {
        const div = document.createElement('div');
        div.className = 'slot-class';
        div.draggable = true;
        div.dataset.classId = classItem.id;

        // Find where this class is scheduled
        let currentRoom = null, currentDay = null, currentTimeBlock = null;
        for (let slotKey in this.schedule) {
            if (this.schedule[slotKey] === classItem.id) {
                [currentRoom, currentDay, currentTimeBlock] = slotKey.split('|');
                break;
            }
        }

        // Get all days this class is scheduled on
        const scheduledDays = this.getScheduledDaysForClass(classItem.id);
        const multiDayIndicator = scheduledDays.length > 1 ?
            `<div class="multi-day-indicator" title="Scheduled on: ${scheduledDays.join(', ')}">${scheduledDays.map(d => d.charAt(0)).join('')}</div>` : '';

        div.innerHTML = `
            ${multiDayIndicator}
            <h4>${classItem.name}</h4>
            <p>${classItem.instructor}</p>
            <p>${classItem.enrollment} students</p>
        `;

        // Add quick-copy buttons for MW/TR patterns
        if (currentRoom && currentDay && currentTimeBlock) {
            const quickCopyDiv = document.createElement('div');
            quickCopyDiv.className = 'quick-copy-buttons';

            // Determine which days to show based on current day
            const copyButtons = this.getQuickCopyDays(currentDay);

            copyButtons.forEach(({ label, targetDay }) => {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.className = 'quick-copy-btn';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.copyToDay(classItem.id, currentRoom, currentDay, currentTimeBlock, targetDay);
                };
                quickCopyDiv.appendChild(btn);
            });

            div.appendChild(quickCopyDiv);
        }

        // Make it draggable
        this.makeDraggable(div);

        return div;
    }

    getScheduledDaysForClass(classId) {
        const days = new Set();
        for (let slotKey in this.schedule) {
            if (this.schedule[slotKey] === classId) {
                const [room, day, timeBlock] = slotKey.split('|');
                days.add(day);
            }
        }
        return Array.from(days).sort((a, b) => {
            const dayOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
            return (dayOrder[a] || 99) - (dayOrder[b] || 99);
        });
    }

    getQuickCopyDays(currentDay) {
        // Return appropriate copy buttons based on current day
        const buttons = [];

        switch(currentDay) {
            case 'Monday':
                buttons.push({ label: '→ Wed', targetDay: 'Wednesday' });
                buttons.push({ label: '→ Fri', targetDay: 'Friday' });
                break;
            case 'Tuesday':
                buttons.push({ label: '→ Thu', targetDay: 'Thursday' });
                break;
            case 'Wednesday':
                buttons.push({ label: '→ Mon', targetDay: 'Monday' });
                buttons.push({ label: '→ Fri', targetDay: 'Friday' });
                break;
            case 'Thursday':
                buttons.push({ label: '→ Tue', targetDay: 'Tuesday' });
                break;
            case 'Friday':
                buttons.push({ label: '→ Mon', targetDay: 'Monday' });
                buttons.push({ label: '→ Wed', targetDay: 'Wednesday' });
                break;
        }

        return buttons;
    }

    copyToDay(classId, sourceRoom, sourceDay, timeBlock, targetDay) {
        const classItem = this.getClassById(classId);
        if (!classItem) return;

        // Check if the target day exists in config
        if (!this.config.days.includes(targetDay)) {
            alert(`${targetDay} is not in your schedule configuration.`);
            return;
        }

        // Check if the time block exists for the target day
        const targetTimeBlocks = this.config.getTimeBlocksForDay(targetDay);
        if (!targetTimeBlocks.includes(timeBlock)) {
            alert(`Time block "${timeBlock}" doesn't exist for ${targetDay}.`);
            return;
        }

        // Ask user to confirm and choose room (same or different)
        const sameRoom = confirm(
            `Copy "${classItem.name}" to ${targetDay} at ${timeBlock}?\n\n` +
            `Click OK to use the same room (${sourceRoom})\n` +
            `Click Cancel to choose a different room`
        );

        let targetRoom = sourceRoom;

        if (!sameRoom) {
            // Show room selection
            const roomChoice = prompt(
                `Enter room for ${targetDay}:\n\nAvailable rooms:\n${this.config.rooms.join(', ')}`,
                sourceRoom
            );

            if (!roomChoice) return; // User cancelled

            if (!this.config.rooms.includes(roomChoice)) {
                alert(`Room "${roomChoice}" is not in your configuration.`);
                return;
            }

            targetRoom = roomChoice;
        }

        // Check if target slot is occupied
        const existingClass = this.getClassInSlot(targetRoom, targetDay, timeBlock);
        if (existingClass) {
            const shouldOverwrite = confirm(
                `${targetRoom} on ${targetDay} at ${timeBlock} already has "${existingClass.name}".\n\n` +
                `Replace it with "${classItem.name}"?`
            );
            if (!shouldOverwrite) return;

            // Remove existing class from that slot
            this.removeClassFromSlot(targetRoom, targetDay, timeBlock);
        }

        // Check for faculty conflicts
        const conflictCheck = this.checkFacultyConflict(classItem.instructor, targetDay, timeBlock);
        if (conflictCheck.conflict) {
            const shouldContinue = confirm(
                `Faculty Conflict Warning!\n\n` +
                `${classItem.instructor} is already teaching "${conflictCheck.conflictingClass.name}" ` +
                `in ${conflictCheck.conflictingRoom} at this time.\n\n` +
                `Continue anyway?`
            );
            if (!shouldContinue) return;
        }

        // Schedule the class in the target slot
        this.assignClassToSlot(classId, targetRoom, targetDay, timeBlock);

        // Re-render
        this.renderScheduleGrid();

        alert(`"${classItem.name}" copied to ${targetDay} in ${targetRoom} at ${timeBlock}`);
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
            <div class="card-actions">
                <button class="edit-btn" onclick="scheduler.editClass(${classItem.id})">Edit</button>
                <button class="remove-btn" onclick="scheduler.removeClass(${classItem.id})">Remove</button>
            </div>
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

            // Check for faculty conflicts
            const classToSchedule = this.getClassById(this.draggedClassId);
            if (classToSchedule) {
                const conflictCheck = this.checkFacultyConflict(
                    classToSchedule.instructor,
                    day,
                    timeBlock,
                    this.draggedClassId
                );

                if (conflictCheck.conflict) {
                    alert(
                        `Faculty Conflict!\n\n` +
                        `${classToSchedule.instructor} is already teaching "${conflictCheck.conflictingClass.name}" ` +
                        `in ${conflictCheck.conflictingRoom} at this time.\n\n` +
                        `Please choose a different time slot.`
                    );
                    return;
                }
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

        // Populate time blocks per day
        const timeBlocksContainer = document.getElementById('timeBlocksPerDay');
        timeBlocksContainer.innerHTML = '';

        this.config.days.forEach(day => {
            const daySection = document.createElement('div');
            daySection.className = 'time-block-day-section';

            const label = document.createElement('label');
            label.textContent = `${day} Time Blocks:`;
            label.style.fontWeight = 'bold';
            label.style.marginTop = '1rem';
            label.style.display = 'block';

            const textarea = document.createElement('textarea');
            textarea.id = `timeBlocks-${day}`;
            textarea.rows = 6;
            textarea.className = 'time-blocks-input';
            textarea.value = this.config.getTimeBlocksForDay(day).join('\n');
            textarea.placeholder = '8:00 AM - 9:15 AM\n9:30 AM - 10:45 AM\n...';

            daySection.appendChild(label);
            daySection.appendChild(textarea);
            timeBlocksContainer.appendChild(daySection);
        });

        this.showModal('configModal');
    }

    resetAddClassModal() {
        // Reset editing mode
        this.editingClassId = null;

        // Reset modal title and button text
        document.querySelector('#addClassModal h2').textContent = 'Add New Class';
        document.querySelector('#addClassForm button[type="submit"]').textContent = 'Add Class';

        // Reset form
        document.getElementById('addClassForm').reset();
    }

    editClass(classId) {
        const classItem = this.getClassById(classId);
        if (!classItem) return;

        // Set editing mode
        this.editingClassId = classId;

        // Update modal title
        document.querySelector('#addClassModal h2').textContent = 'Edit Class';

        // Populate form with existing data
        document.getElementById('className').value = classItem.name;
        document.getElementById('classTitle').value = classItem.title;
        document.getElementById('instructor').value = classItem.instructor === 'TBD' ? '' : classItem.instructor;
        document.getElementById('enrollment').value = classItem.enrollment;
        document.getElementById('duration').value = classItem.duration;

        // Update button text
        const submitBtn = document.querySelector('#addClassForm button[type="submit"]');
        submitBtn.textContent = 'Update Class';

        // Show modal
        this.showModal('addClassModal');
    }

    handleAddClass() {
        const name = document.getElementById('className').value.trim();
        const title = document.getElementById('classTitle').value.trim();
        const instructor = document.getElementById('instructor').value.trim() || 'TBD';
        const enrollment = parseInt(document.getElementById('enrollment').value);
        const duration = parseInt(document.getElementById('duration').value);

        if (!name || !title) {
            alert('Please fill in all required fields (Class Name and Title)');
            return;
        }

        if (this.editingClassId !== null) {
            // Edit mode - update existing class
            const classItem = this.getClassById(this.editingClassId);
            if (classItem) {
                classItem.name = name;
                classItem.title = title;
                classItem.instructor = instructor;
                classItem.enrollment = enrollment;
                classItem.duration = duration;
            }
        } else {
            // Add mode - create new class
            const newClass = new ClassItem(this.nextClassId++, name, title, instructor, enrollment, duration);
            this.addClass(newClass);
        }

        // Close modal and reset
        document.getElementById('addClassModal').style.display = 'none';
        this.resetAddClassModal();

        // Re-render both unassigned classes and the schedule grid (in case class is scheduled)
        this.renderUnassignedClasses();
        this.renderScheduleGrid();
    }

    handleConfigUpdate() {
        const roomsText = document.getElementById('rooms').value.trim();
        const daysText = document.getElementById('days').value.trim();

        if (!roomsText || !daysText) {
            alert('Please fill in all configuration fields');
            return;
        }

        // Update rooms and days
        const newRooms = roomsText.split('\n').map(r => r.trim()).filter(r => r);
        const newDays = daysText.split('\n').map(d => d.trim()).filter(d => d);

        // Update time blocks per day
        const newTimeBlocksByDay = {};
        let allFieldsFilled = true;

        newDays.forEach(day => {
            const textarea = document.getElementById(`timeBlocks-${day}`);
            if (textarea) {
                const blocks = textarea.value.trim().split('\n').map(t => t.trim()).filter(t => t);
                if (blocks.length === 0) {
                    allFieldsFilled = false;
                }
                newTimeBlocksByDay[day] = blocks;
            }
        });

        if (!allFieldsFilled) {
            alert('Please fill in time blocks for all days');
            return;
        }

        // Update config
        this.config.rooms = newRooms;
        this.config.days = newDays;
        this.config.timeBlocksByDay = newTimeBlocksByDay;

        // Update room order to include new rooms and remove deleted ones
        this.config.updateRoomOrder();

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

    showReportsModal() {
        // Generate report data
        const reportData = this.generateReportData();

        // Populate report view
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = this.renderReportHTML(reportData);

        // Setup export handlers
        document.getElementById('exportReportCSV').onclick = () => this.exportReportCSV(reportData);
        document.getElementById('exportReportHTML').onclick = () => this.exportReportHTML(reportData);

        this.showModal('reportsModal');
    }

    generateReportData() {
        const scheduledClasses = [];
        const unscheduledClasses = [];

        // Get scheduled classes
        for (let slotKey in this.schedule) {
            const [room, day, timeBlock] = slotKey.split('|');
            const classItem = this.getClassById(this.schedule[slotKey]);
            if (classItem) {
                scheduledClasses.push({
                    ...classItem,
                    room,
                    day,
                    timeBlock
                });
            }
        }

        // Get unscheduled classes
        this.classes.forEach(c => {
            if (!this.isClassScheduled(c.id)) {
                unscheduledClasses.push(c);
            }
        });

        // Sort by various criteria
        const byEnrollment = [...this.classes].sort((a, b) => b.enrollment - a.enrollment);
        const byInstructor = [...this.classes].sort((a, b) => a.instructor.localeCompare(b.instructor));
        const byClassName = [...this.classes].sort((a, b) => a.name.localeCompare(b.name));

        // Get faculty conflict information
        const facultyConflicts = this.detectAllFacultyConflicts();

        return {
            scheduledClasses,
            unscheduledClasses,
            byEnrollment,
            byInstructor,
            byClassName,
            facultyConflicts,
            totalClasses: this.classes.length,
            totalScheduled: scheduledClasses.length,
            totalUnscheduled: unscheduledClasses.length,
            totalEnrollment: this.classes.reduce((sum, c) => sum + c.enrollment, 0)
        };
    }

    detectAllFacultyConflicts() {
        // Detect any existing faculty conflicts in the schedule
        const conflicts = [];
        const checked = new Set();

        for (let slotKey in this.schedule) {
            if (checked.has(slotKey)) continue;

            const [room, day, timeBlock] = slotKey.split('|');
            const classId = this.schedule[slotKey];
            const classItem = this.getClassById(classId);

            if (!classItem) continue;

            const conflictCheck = this.checkFacultyConflict(
                classItem.instructor,
                day,
                timeBlock,
                classId
            );

            if (conflictCheck.conflict) {
                conflicts.push({
                    instructor: classItem.instructor,
                    day,
                    timeBlock,
                    class1: classItem,
                    room1: room,
                    class2: conflictCheck.conflictingClass,
                    room2: conflictCheck.conflictingRoom
                });
            }

            checked.add(slotKey);
        }

        return conflicts;
    }

    renderReportHTML(data) {
        let html = `
            <div class="report-section">
                <h3>Summary Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Total Classes</div>
                        <div class="stat-value">${data.totalClasses}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Scheduled</div>
                        <div class="stat-value">${data.totalScheduled}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Unscheduled</div>
                        <div class="stat-value">${data.totalUnscheduled}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Enrollment</div>
                        <div class="stat-value">${data.totalEnrollment}</div>
                    </div>
                    <div class="stat-item ${data.facultyConflicts.length > 0 ? 'stat-warning' : 'stat-success'}">
                        <div class="stat-label">Faculty Conflicts</div>
                        <div class="stat-value">${data.facultyConflicts.length}</div>
                    </div>
                </div>
            </div>

            ${data.facultyConflicts.length > 0 ? `
            <div class="report-section">
                <h3 style="color: #e74c3c;">⚠️ Faculty Conflicts Detected</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Instructor</th>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Class 1</th>
                            <th>Room 1</th>
                            <th>Class 2</th>
                            <th>Room 2</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.facultyConflicts.map(conflict => `
                            <tr style="background-color: #ffe6e6;">
                                <td><strong>${conflict.instructor}</strong></td>
                                <td>${conflict.day}</td>
                                <td>${conflict.timeBlock}</td>
                                <td>${conflict.class1.name}</td>
                                <td>${conflict.room1}</td>
                                <td>${conflict.class2.name}</td>
                                <td>${conflict.room2}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div class="report-section">
                <h3>Scheduled Classes by Location and Time</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Course</th>
                            <th>Title</th>
                            <th>Instructor</th>
                            <th>Room</th>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Enrollment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.scheduledClasses.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.title}</td>
                                <td>${c.instructor}</td>
                                <td>${c.room}</td>
                                <td>${c.day}</td>
                                <td>${c.timeBlock}</td>
                                <td>${c.enrollment}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${data.unscheduledClasses.length > 0 ? `
            <div class="report-section">
                <h3>Unscheduled Classes</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Course</th>
                            <th>Title</th>
                            <th>Instructor</th>
                            <th>Enrollment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.unscheduledClasses.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.title}</td>
                                <td>${c.instructor}</td>
                                <td>${c.enrollment}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div class="report-section">
                <h3>Classes by Instructor</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Instructor</th>
                            <th>Course</th>
                            <th>Title</th>
                            <th>Enrollment</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.byInstructor.map(c => `
                            <tr>
                                <td>${c.instructor}</td>
                                <td>${c.name}</td>
                                <td>${c.title}</td>
                                <td>${c.enrollment}</td>
                                <td>${this.isClassScheduled(c.id) ? 'Scheduled' : 'Unscheduled'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    exportReportCSV(data) {
        let csv = 'Course,Title,Instructor,Room,Day,Time,Enrollment,Status\n';

        // Add all classes
        this.classes.forEach(c => {
            const scheduled = this.isClassScheduled(c.id);
            let room = '', day = '', timeBlock = '';

            if (scheduled) {
                for (let slotKey in this.schedule) {
                    if (this.schedule[slotKey] === c.id) {
                        [room, day, timeBlock] = slotKey.split('|');
                        break;
                    }
                }
            }

            csv += `"${c.name}","${c.title}","${c.instructor}","${room}","${day}","${timeBlock}",${c.enrollment},${scheduled ? 'Scheduled' : 'Unscheduled'}\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `schedule-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    exportReportHTML(data) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Schedule Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #34495e; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .stat-item { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-label { font-size: 14px; color: #7f8c8d; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
    </style>
</head>
<body>
    <h1>Class Schedule Report</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
    ${this.renderReportHTML(data)}
</body>
</html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `schedule-report-${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    clearSchedule() {
        this.schedule = {};
        this.renderScheduleGrid();
        this.renderUnassignedClasses();
    }

    async saveToServer() {
        const data = {
            config: this.config,
            classes: this.classes,
            schedule: this.schedule,
            nextClassId: this.nextClassId
        };

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('Schedule saved successfully!');
            } else {
                alert('Error saving schedule: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving to server:', error);
            alert('Error saving schedule. Please check your connection.');
        }
    }

    async loadFromServer() {
        try {
            const response = await fetch('/api/load');
            const result = await response.json();

            if (result.success && result.data) {
                const data = result.data;

                // Restore config with backward compatibility
                if (data.config) {
                    this.config = new ScheduleConfig();
                    this.config.rooms = data.config.rooms || this.config.rooms;
                    this.config.days = data.config.days || this.config.days;

                    // Handle roomOrder with backward compatibility
                    if (data.config.roomOrder) {
                        this.config.roomOrder = data.config.roomOrder;
                    } else {
                        // Initialize roomOrder from rooms if not present
                        this.config.roomOrder = [...this.config.rooms];
                    }

                    // Handle both old timeBlocks and new timeBlocksByDay
                    if (data.config.timeBlocksByDay) {
                        this.config.timeBlocksByDay = data.config.timeBlocksByDay;
                    } else if (data.config.timeBlocks) {
                        // Migrate old format to new format
                        this.config.days.forEach(day => {
                            this.config.timeBlocksByDay[day] = data.config.timeBlocks;
                        });
                    }
                }

                this.classes = data.classes.map(c => new ClassItem(c.id, c.name, c.title, c.instructor, c.enrollment, c.duration));
                this.schedule = data.schedule;
                this.nextClassId = data.nextClassId;

                this.renderScheduleGrid();
                this.renderUnassignedClasses();

                console.log('Data loaded from server successfully');
            } else if (!result.success) {
                console.error('Error loading from server:', result.error);
            } else {
                console.log('No saved data found on server');
            }
        } catch (error) {
            console.error('Error loading from server:', error);
            console.log('Using default configuration');
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
