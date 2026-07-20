// Data Models
class Course {
    constructor(id, code, title, credits = 3) {
        this.id = id;
        this.code = code; // e.g., "CSCI 101"
        this.title = title; // e.g., "Intro to Computer Science"
        this.credits = credits; // Default to 3 credits
    }
}

class Section {
    constructor(id, courseId, sectionNumber, instructor, enrollment, duration = 1, crn = null) {
        this.id = id;
        this.courseId = courseId;
        this.sectionNumber = sectionNumber; // e.g., "001"
        this.instructor = instructor;
        this.enrollment = enrollment; // Set based on room capacity
        this.duration = duration; // How many time blocks this section spans
        this.crn = crn; // Course Reference Number
    }

    getDisplayName(courseCode) {
        return `${courseCode}-${this.sectionNumber}`;
    }
}

class ScheduleConfig {
    constructor() {
        this.rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Lab A', 'Lab B'];
        this.roomOrder = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Lab A', 'Lab B']; // Order of columns
        this.roomCapacities = {
            'Room 101': 30,
            'Room 102': 30,
            'Room 103': 35,
            'Room 104': 35,
            'Lab A': 25,
            'Lab B': 25
        };
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        // Fixed 15-minute time grid
        this.gridStartHour = 8; // 8:00 AM
        this.gridStartMinute = 0;
        this.gridEndHour = 17; // 5:00 PM
        this.gridEndMinute = 0;
        this.gridIntervalMinutes = 15;

        // Generate time blocks
        this.timeBlocks = this.generateTimeBlocks();
    }

    generateTimeBlocks() {
        const blocks = [];
        let currentMinutes = this.gridStartHour * 60 + this.gridStartMinute;
        const endMinutes = this.gridEndHour * 60 + this.gridEndMinute;

        while (currentMinutes < endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const mins = currentMinutes % 60;
            const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
            const meridiem = hours >= 12 ? 'PM' : 'AM';
            const timeLabel = `${displayHours}:${mins.toString().padStart(2, '0')} ${meridiem}`;

            blocks.push({
                label: timeLabel,
                startMinutes: currentMinutes,
                hours24: hours,
                minutes: mins
            });

            currentMinutes += this.gridIntervalMinutes;
        }

        return blocks;
    }

    getTimeBlocksForDay(day) {
        // All days use the same fixed time grid
        return this.timeBlocks;
    }

    getAllUniqueTimeBlocks() {
        return this.timeBlocks;
    }

    // Find the closest time block index for a given time
    findClosestTimeBlock(hours24, minutes) {
        const targetMinutes = hours24 * 60 + minutes;
        let closestIndex = 0;
        let closestDiff = Math.abs(this.timeBlocks[0].startMinutes - targetMinutes);

        for (let i = 1; i < this.timeBlocks.length; i++) {
            const diff = Math.abs(this.timeBlocks[i].startMinutes - targetMinutes);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestIndex = i;
            }
        }

        return closestIndex;
    }

    // Calculate how many grid blocks a duration spans
    calculateBlockSpan(durationMinutes) {
        return Math.max(1, Math.round(durationMinutes / this.gridIntervalMinutes));
    }

    getRoomCapacity(room) {
        return this.roomCapacities[room] || 30; // Default to 30
    }

    setRoomCapacity(room, capacity) {
        this.roomCapacities[room] = capacity;
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

        // Add any new rooms to the end and initialize capacities
        this.rooms.forEach(room => {
            if (!newOrder.includes(room)) {
                newOrder.push(room);
            }
            // Initialize capacity for new rooms if not set
            if (!this.roomCapacities[room]) {
                this.roomCapacities[room] = 30; // Default capacity
            }
        });

        this.roomOrder = newOrder;
    }
}

// Main Scheduler Application
class Scheduler {
    constructor() {
        this.config = new ScheduleConfig();
        this.courses = []; // Course catalog
        this.sections = []; // Scheduled sections
        // New schedule structure: array of placement objects
        this.schedulePlacements = []; // {sectionId, room, day, startBlockIndex, blockSpan}
        this.nextCourseId = 1;
        this.nextSectionId = 1;
        this.nextPlacementId = 1;
        this.draggedElement = null;
        this.draggedCourseId = null; // For dragging from catalog
        this.draggedSectionId = null; // For dragging scheduled sections
        this.editingCourseId = null; // Track which course is being edited

        // Semester and campus tracking
        this.semester = 'Fall'; // Fall, Spring, Summer
        this.year = new Date().getFullYear();
        this.campus = 'Main Campus'; // Main Campus, BlueSky Tennessee Institute

        this.init();
    }

    init() {
        // Add some sample courses to catalog
        this.addSampleCourses();

        // Setup event listeners
        this.setupEventListeners();

        // Try to load schedule for current semester/year/campus from localStorage
        this.switchSchedule();

        // If no schedule was loaded, render the default UI
        if (this.courses.length === 0) {
            this.renderScheduleGrid();
            this.renderCourseCatalog();
        }
    }

    addSampleCourses() {
        this.addCourse(new Course(this.nextCourseId++, 'CSCI 101', 'Intro to Computer Science'));
        this.addCourse(new Course(this.nextCourseId++, 'CSCI 201', 'Data Structures'));
        this.addCourse(new Course(this.nextCourseId++, 'CSCI 301', 'Algorithms'));
        this.addCourse(new Course(this.nextCourseId++, 'CSCI 350', 'Operating Systems'));
        this.addCourse(new Course(this.nextCourseId++, 'CSCI 401', 'Software Engineering'));
        this.addCourse(new Course(this.nextCourseId++, 'CSCI 450', 'Database Systems'));
    }

    setupEventListeners() {
        // Add Class button
        document.getElementById('addClassBtn').addEventListener('click', () => {
            this.showModal('addClassModal');
        });

        // Bulk Import button
        document.getElementById('bulkImportBtn').addEventListener('click', () => {
            this.showModal('bulkImportModal');
        });

        // Configure button
        document.getElementById('configBtn').addEventListener('click', () => {
            this.showConfigModal();
        });

        // Sync Catalog button
        document.getElementById('syncBtn').addEventListener('click', () => {
            this.syncCatalog();
        });

        // Import Spreadsheet button
        document.getElementById('importSpreadsheetBtn').addEventListener('click', () => {
            this.showModal('importSpreadsheetModal');
        });

        // Spreadsheet file input
        document.getElementById('spreadsheetFileInput').addEventListener('change', (e) => {
            this.handleSpreadsheetFileSelect(e);
        });

        // Confirm spreadsheet import button
        document.getElementById('confirmSpreadsheetImport').addEventListener('click', () => {
            this.confirmSpreadsheetImport();
        });

        // Reports button
        document.getElementById('reportsBtn').addEventListener('click', () => {
            this.showReportsModal();
        });

        // Manage Schedules button
        document.getElementById('manageSchedulesBtn').addEventListener('click', () => {
            this.showManageSchedulesModal();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToJSON();
        });

        // Import button
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        // Import file input
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            this.handleImportFile(e);
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the entire schedule? This cannot be undone.')) {
                this.clearSchedule();
            }
        });

        // Semester, Year, and Campus selectors
        document.getElementById('semesterSelect').addEventListener('change', (e) => {
            const oldKey = this.getScheduleKey();
            this.saveCurrentSchedule(); // Save current schedule before switching
            this.semester = e.target.value;
            this.switchSchedule(); // Load the schedule for the new semester/year/campus
        });

        document.getElementById('yearInput').addEventListener('change', (e) => {
            const oldKey = this.getScheduleKey();
            this.saveCurrentSchedule(); // Save current schedule before switching
            this.year = parseInt(e.target.value);
            this.switchSchedule(); // Load the schedule for the new semester/year/campus
        });

        document.getElementById('campusSelect').addEventListener('change', (e) => {
            const oldKey = this.getScheduleKey();
            this.saveCurrentSchedule(); // Save current schedule before switching
            this.campus = e.target.value;
            this.switchSchedule(); // Load the schedule for the new semester/year/campus
        });

        // Initialize semester/year/campus UI
        this.updateScheduleInfoUI();

        // Add course form
        document.getElementById('addClassForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCourse();
        });

        // Bulk import form
        document.getElementById('bulkImportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBulkImport();
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

                // Reset edit mode if closing the add/edit course modal
                if (modal.id === 'addClassModal') {
                    this.resetAddCourseModal();
                    // Show hidden fields again
                    document.getElementById('instructor').parentElement.style.display = '';
                    document.getElementById('enrollment').parentElement.style.display = '';
                    document.getElementById('duration').parentElement.style.display = '';
                }
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';

                // Reset edit mode if closing the add/edit course modal
                if (e.target.id === 'addClassModal') {
                    this.resetAddCourseModal();
                    // Show hidden fields again
                    document.getElementById('instructor').parentElement.style.display = '';
                    document.getElementById('enrollment').parentElement.style.display = '';
                    document.getElementById('duration').parentElement.style.display = '';
                }
            }
        });
    }

    // Course management
    addCourse(course) {
        this.courses.push(course);
    }

    removeCourse(courseId) {
        // Remove course from catalog
        this.courses = this.courses.filter(c => c.id !== courseId);

        // Remove all sections of this course
        const sectionsToRemove = this.sections.filter(s => s.courseId === courseId);
        sectionsToRemove.forEach(section => {
            this.removeSection(section.id);
        });

        this.renderScheduleGrid();
        this.renderCourseCatalog();
        this.saveCurrentSchedule(); // Auto-save after removing course
    }

    getCourseById(courseId) {
        return this.courses.find(c => c.id === courseId);
    }

    // Section management
    addSection(section) {
        this.sections.push(section);
    }

    removeSection(sectionId) {
        // Remove section from sections array
        this.sections = this.sections.filter(s => s.id !== sectionId);

        // Remove from schedule (handle array format)
        for (let slotKey in this.schedule) {
            const sectionIds = this.schedule[slotKey] || [];
            this.schedule[slotKey] = sectionIds.filter(id => id !== sectionId);
            if (this.schedule[slotKey].length === 0) {
                delete this.schedule[slotKey];
            }
        }

        // Auto-save after removing section
        this.saveCurrentSchedule();
    }

    getSectionById(sectionId) {
        return this.sections.find(s => s.id === sectionId);
    }

    isSectionScheduled(sectionId) {
        for (let slotKey in this.schedule) {
            const sectionIds = this.schedule[slotKey] || [];
            if (sectionIds.includes(sectionId)) {
                return true;
            }
        }
        return false;
    }

    getSectionsForCourse(courseId) {
        return this.sections.filter(s => s.courseId === courseId);
    }

    // Add a section to the schedule at a specific time slot
    addPlacement(sectionId, room, day, startBlockIndex, blockSpan) {
        const placement = {
            id: this.nextPlacementId++,
            sectionId,
            room,
            day,
            startBlockIndex,
            blockSpan
        };
        this.schedulePlacements.push(placement);
        return placement;
    }

    // Remove a placement by ID
    removePlacement(placementId) {
        this.schedulePlacements = this.schedulePlacements.filter(p => p.id !== placementId);
    }

    // Remove all placements for a section
    removeSectionPlacements(sectionId) {
        this.schedulePlacements = this.schedulePlacements.filter(p => p.sectionId !== sectionId);
    }

    // Remove all placements for a section on a specific day
    removeSectionPlacementsOnDay(sectionId, day) {
        this.schedulePlacements = this.schedulePlacements.filter(p =>
            !(p.sectionId === sectionId && p.day === day)
        );
    }

    // Get all placements in a specific time block
    getPlacementsInBlock(room, day, blockIndex) {
        return this.schedulePlacements.filter(p => {
            if (p.room !== room || p.day !== day) return false;
            // Check if this block is within the placement's span
            return blockIndex >= p.startBlockIndex &&
                   blockIndex < (p.startBlockIndex + p.blockSpan);
        });
    }

    // Get sections in a specific time block
    getSectionsInSlot(room, day, blockIndex) {
        const placements = this.getPlacementsInBlock(room, day, blockIndex);
        const sectionIds = [...new Set(placements.map(p => p.sectionId))];
        return sectionIds.map(id => this.getSectionById(id)).filter(s => s !== undefined);
    }

    // Get all placements for a section
    getPlacementsForSection(sectionId) {
        return this.schedulePlacements.filter(p => p.sectionId === sectionId);
    }

    // Backward compatibility: assignSectionToSlot with time in hours/minutes
    assignSectionToSlot(sectionId, room, day, startHours, startMinutes, endHours, endMinutes) {
        // Find closest start block
        const startBlockIndex = this.config.findClosestTimeBlock(startHours, startMinutes);

        // Calculate duration and span
        const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        const blockSpan = this.config.calculateBlockSpan(durationMinutes);

        return this.addPlacement(sectionId, room, day, startBlockIndex, blockSpan);
    }

    isCrossListedPair(courseCode) {
        // Check if course code matches pattern 4xx7 (where xx can be any digits)
        return /^4\d{2}7$/.test(courseCode);
    }

    generateCrossListedCourseCode(courseCode) {
        // Convert 4xx7 to 5xx7
        if (this.isCrossListedPair(courseCode)) {
            return '5' + courseCode.substring(1);
        }
        return null;
    }

    checkFacultyConflict(instructor, day, timeBlock, excludeSectionId = null) {
        // Skip conflict check for TBD instructors (unassigned)
        if (!instructor || instructor === 'TBD') {
            return { conflict: false };
        }

        // Check if this instructor is already teaching at this time on this day
        for (let slotKey in this.schedule) {
            const [room, slotDay, slotTime] = slotKey.split('|');

            // Check if it's the same day and time block
            if (slotDay === day && slotTime === timeBlock) {
                const sectionIds = this.schedule[slotKey] || [];

                for (let sectionId of sectionIds) {
                    // Skip if this is the same section we're moving
                    if (sectionId === excludeSectionId) continue;

                    const section = this.getSectionById(sectionId);
                    if (section && section.instructor === instructor && section.instructor !== 'TBD') {
                        const course = this.getCourseById(section.courseId);
                        return {
                            conflict: true,
                            conflictingSection: section,
                            conflictingCourse: course,
                            conflictingRoom: room
                        };
                    }
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
            const sectionIds = this.schedule[slotKey] || [];

            for (let sectionId of sectionIds) {
                const section = this.getSectionById(sectionId);

                if (section && section.instructor === instructor) {
                    const course = this.getCourseById(section.courseId);
                    schedule.push({
                        section,
                        course,
                        room,
                        day,
                        timeBlock
                    });
                }
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

            // Time blocks rows - 15-minute increments
            const timeBlocks = this.config.getTimeBlocksForDay(day);
            const renderedPlacements = new Set(); // Track which placements we've already rendered

            timeBlocks.forEach((timeBlock, blockIndex) => {
                const row = document.createElement('tr');

                // Time label
                const timeCell = document.createElement('th');
                timeCell.className = 'time-header';
                timeCell.textContent = timeBlock.label;
                row.appendChild(timeCell);

                // Room slots (in the configured order)
                this.config.roomOrder.forEach(room => {
                    // Find placements that start at this block
                    const placementsStartingHere = this.schedulePlacements.filter(p =>
                        p.room === room && p.day === day && p.startBlockIndex === blockIndex
                    );

                    // Find placements that are spanning through this block
                    const placementsSpanningHere = this.schedulePlacements.filter(p =>
                        p.room === room && p.day === day &&
                        blockIndex > p.startBlockIndex &&
                        blockIndex < (p.startBlockIndex + p.blockSpan) &&
                        !renderedPlacements.has(p.id)
                    );

                    if (placementsStartingHere.length > 0) {
                        // Create cell with section(s) that start here
                        placementsStartingHere.forEach(placement => {
                            const slot = document.createElement('td');
                            slot.className = 'time-slot occupied';
                            slot.rowSpan = placement.blockSpan;
                            slot.dataset.room = room;
                            slot.dataset.day = day;
                            slot.dataset.blockIndex = blockIndex;
                            slot.dataset.placementId = placement.id;

                            const section = this.getSectionById(placement.sectionId);
                            if (section) {
                                const sectionDiv = this.createScheduledSectionElement(placement, section, room, day);
                                slot.appendChild(sectionDiv);
                            }

                            // Make slot a drop target
                            this.makeDropTarget(slot);

                            row.appendChild(slot);
                            renderedPlacements.add(placement.id);
                        });
                    } else if (placementsSpanningHere.length === 0) {
                        // Empty slot - no section starting or spanning here
                        const slot = document.createElement('td');
                        slot.className = 'time-slot';
                        slot.dataset.room = room;
                        slot.dataset.day = day;
                        slot.dataset.blockIndex = blockIndex;

                        // Make slot a drop target
                        this.makeDropTarget(slot);

                        row.appendChild(slot);
                    }
                    // If placementsSpanningHere.length > 0, we don't create a cell (it's covered by rowSpan)
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

    createScheduledSectionElement(placement, section, currentRoom, currentDay) {
        const course = this.getCourseById(section.courseId);
        if (!course) return document.createElement('div');

        const div = document.createElement('div');
        div.className = 'slot-class';
        div.draggable = true;
        div.dataset.sectionId = section.id;
        div.dataset.placementId = placement.id;

        // Get all days this section is scheduled on
        const scheduledDays = this.getScheduledDaysForSection(section.id);
        const multiDayIndicator = scheduledDays.length > 1 ?
            `<div class="multi-day-indicator" title="Scheduled on: ${scheduledDays.join(', ')}">${scheduledDays.map(d => d.charAt(0)).join('')}</div>` : '';

        const displayName = section.getDisplayName(course.code);

        // Calculate time display
        const startBlock = this.config.timeBlocks[placement.startBlockIndex];
        const endBlockIndex = placement.startBlockIndex + placement.blockSpan;
        const endBlock = this.config.timeBlocks[Math.min(endBlockIndex, this.config.timeBlocks.length - 1)];
        const timeDisplay = startBlock && endBlock ? `${startBlock.label} - ${endBlock.label}` : '';

        div.innerHTML = `
            ${multiDayIndicator}
            <h4>${displayName}</h4>
            <p>${section.instructor}</p>
            <p class="time-display">${timeDisplay}</p>
            <p>${section.enrollment} students</p>
        `;

        // Add action buttons container
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'slot-actions';

        // Add edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'slot-edit-btn';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            this.editSection(section.id);
        };
        actionsDiv.appendChild(editBtn);

        // Add remove button (unschedule from this slot)
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'slot-remove-btn';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Remove "${displayName}" from ${currentDay}?`)) {
                this.removePlacement(placement.id);
                this.renderScheduleGrid();
                this.renderCourseCatalog(); // Update section counts
                this.saveCurrentSchedule();
            }
        };
        actionsDiv.appendChild(removeBtn);

        div.appendChild(actionsDiv);

        // Add quick-copy buttons for MW/TR patterns
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
                this.copyPlacementToDay(placement, targetDay);
            };
            quickCopyDiv.appendChild(btn);
        });

        div.appendChild(quickCopyDiv);

        // Make it draggable
        this.makeDraggableSection(div);

        return div;
    }

    getScheduledDaysForSection(sectionId) {
        const days = new Set();
        this.schedulePlacements.forEach(p => {
            if (p.sectionId === sectionId) {
                days.add(p.day);
            }
        });
        return Array.from(days).sort((a, b) => {
            const dayOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
            return (dayOrder[a] || 99) - (dayOrder[b] || 99);
        });
    }

    copyPlacementToDay(placement, targetDay) {
        // Check if already scheduled on target day
        const existing = this.schedulePlacements.find(p =>
            p.sectionId === placement.sectionId &&
            p.day === targetDay &&
            p.room === placement.room
        );

        if (existing) {
            alert(`This section is already scheduled on ${targetDay}`);
            return;
        }

        // Copy the placement
        this.addPlacement(
            placement.sectionId,
            placement.room,
            targetDay,
            placement.startBlockIndex,
            placement.blockSpan
        );

        this.renderScheduleGrid();
        this.renderCourseCatalog();
        this.saveCurrentSchedule();
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

    copySectionToDay(sectionId, sourceRoom, sourceDay, timeBlock, targetDay) {
        const section = this.getSectionById(sectionId);
        if (!section) return;

        const course = this.getCourseById(section.courseId);
        if (!course) return;

        const displayName = section.getDisplayName(course.code);

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
            `Copy "${displayName}" to ${targetDay} at ${timeBlock}?\n\n` +
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

        // Check if target slot is occupied (multiple sections allowed now)
        const existingSections = this.getSectionsInSlot(targetRoom, targetDay, timeBlock);
        if (existingSections.length >= 2) {
            alert(`${targetRoom} on ${targetDay} at ${timeBlock} already has 2 sections (maximum).\n\nPlease choose another slot.`);
            return;
        }

        // Check for faculty conflicts
        const conflictCheck = this.checkFacultyConflict(section.instructor, targetDay, timeBlock);
        if (conflictCheck.conflict) {
            const conflictCourse = conflictCheck.conflictingCourse;
            const conflictSection = conflictCheck.conflictingSection;
            const conflictDisplayName = conflictSection.getDisplayName(conflictCourse.code);

            const shouldContinue = confirm(
                `Faculty Conflict Warning!\n\n` +
                `${section.instructor} is already teaching "${conflictDisplayName}" ` +
                `in ${conflictCheck.conflictingRoom} at this time.\n\n` +
                `Continue anyway?`
            );
            if (!shouldContinue) return;
        }

        // Schedule the section in the target slot
        this.assignSectionToSlot(sectionId, targetRoom, targetDay, timeBlock);

        // Re-render
        this.renderScheduleGrid();

        // Auto-save after copying section
        this.saveCurrentSchedule();

        alert(`"${displayName}" copied to ${targetDay} in ${targetRoom} at ${timeBlock}`);
    }

    renderCourseCatalog() {
        const container = document.getElementById('unassignedClasses');
        container.innerHTML = '';

        if (this.courses.length === 0) {
            container.innerHTML = '<p class="empty-state">No courses in catalog. Add courses to get started!</p>';
            return;
        }

        this.courses.forEach(course => {
            const card = this.createCourseCard(course);
            container.appendChild(card);
        });
    }

    updateScheduleInfoUI() {
        // Update UI to reflect current semester, year, and campus
        document.getElementById('semesterSelect').value = this.semester;
        document.getElementById('yearInput').value = this.year;
        document.getElementById('campusSelect').value = this.campus;
    }

    createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.draggable = true;
        card.dataset.courseId = course.id;

        // Count sections for this course
        const sections = this.getSectionsForCourse(course.id);
        const sectionCount = sections.length;

        card.innerHTML = `
            <h3>${course.code}</h3>
            <div class="class-title">${course.title}</div>
            <div class="enrollment">${sectionCount} section${sectionCount !== 1 ? 's' : ''}</div>
            <div class="card-actions">
                <button class="edit-btn" onclick="scheduler.editCourse(${course.id})">Edit</button>
                <button class="remove-btn" onclick="scheduler.removeCourse(${course.id})">Remove</button>
            </div>
        `;

        // Make it draggable
        this.makeDraggableCourse(card);

        return card;
    }

    makeDraggableCourse(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedElement = element;
            this.draggedCourseId = parseInt(element.dataset.courseId);
            this.draggedSectionId = null; // Not dragging a section
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy'; // Use copy since we're creating a new section
            e.dataTransfer.setData('text/html', element.innerHTML);
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            this.draggedElement = null;
        });
    }

    makeDraggableSection(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedElement = element;
            this.draggedSectionId = parseInt(element.dataset.sectionId);
            this.draggedCourseId = null; // Not dragging a course
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
            e.dataTransfer.dropEffect = this.draggedCourseId ? 'copy' : 'move';
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', (e) => {
            slot.classList.remove('drag-over');
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');

            const room = slot.dataset.room;
            const day = slot.dataset.day;
            const timeBlock = slot.dataset.timeBlock;

            if (this.draggedCourseId) {
                // Dragging a course from catalog - create new section
                this.showCreateSectionDialog(this.draggedCourseId, room, day, timeBlock);
                this.draggedCourseId = null;
            } else if (this.draggedSectionId) {
                // Dragging an existing section - move it
                this.moveSection(this.draggedSectionId, room, day, timeBlock);
                this.draggedSectionId = null;
            }
        });
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    showCreateSectionDialog(courseId, room, day, timeBlock) {
        const course = this.getCourseById(courseId);
        if (!course) return;

        const roomCapacity = this.config.getRoomCapacity(room);

        // Prompt for section number
        const sectionNumber = prompt(
            `Creating section for ${course.code} - ${course.title}\n\n` +
            `Room: ${room} (Capacity: ${roomCapacity})\n` +
            `Day: ${day}\n` +
            `Time: ${timeBlock}\n\n` +
            `Enter section number:`,
            '001'
        );

        if (!sectionNumber) return; // User cancelled

        // Prompt for instructor
        const instructor = prompt(
            `Enter instructor name:\n(Leave blank for TBD)`,
            ''
        );

        const instructorName = instructor ? instructor.trim() : 'TBD';

        // Check if section already exists with same number
        const courseSections = this.getSectionsForCourse(courseId);
        const duplicate = courseSections.find(s => s.sectionNumber === sectionNumber);
        if (duplicate) {
            const shouldContinue = confirm(
                `A section ${course.code}-${sectionNumber} already exists.\n\n` +
                `Create another section with the same number?`
            );
            if (!shouldContinue) return;
        }

        // Check if slot is at capacity (max 2 sections)
        const existingSections = this.getSectionsInSlot(room, day, timeBlock);
        if (existingSections.length >= 2) {
            alert(`${room} on ${day} at ${timeBlock} already has 2 sections (maximum).\n\nPlease choose another slot.`);
            return;
        }

        // Check for faculty conflicts
        if (instructorName !== 'TBD') {
            const conflictCheck = this.checkFacultyConflict(instructorName, day, timeBlock);
            if (conflictCheck.conflict) {
                const conflictCourse = conflictCheck.conflictingCourse;
                const conflictSection = conflictCheck.conflictingSection;
                const conflictDisplayName = conflictSection.getDisplayName(conflictCourse.code);

                const shouldContinue = confirm(
                    `Faculty Conflict Warning!\n\n` +
                    `${instructorName} is already teaching "${conflictDisplayName}" ` +
                    `in ${conflictCheck.conflictingRoom} at this time.\n\n` +
                    `Continue anyway?`
                );
                if (!shouldContinue) return;
            }
        }

        // Create the section
        const newSection = new Section(
            this.nextSectionId++,
            courseId,
            sectionNumber,
            instructorName,
            roomCapacity, // Use room capacity as enrollment
            1 // Default duration
        );

        this.addSection(newSection);
        this.assignSectionToSlot(newSection.id, room, day, timeBlock);

        // Auto-save after creating section
        this.saveCurrentSchedule();

        // Check if this is a cross-listed course (4xx7 pattern)
        const crossListedCode = this.generateCrossListedCourseCode(course.code);
        if (crossListedCode) {
            // Find or create the cross-listed course
            let crossListedCourse = this.courses.find(c => c.code === crossListedCode);
            if (!crossListedCourse) {
                // Create the cross-listed course automatically
                crossListedCourse = new Course(this.nextCourseId++, crossListedCode, course.title, course.credits);
                this.addCourse(crossListedCourse);
            }

            // Create the paired section with the same section number and instructor
            const crossListedSection = new Section(
                this.nextSectionId++,
                crossListedCourse.id,
                sectionNumber,
                instructorName,
                roomCapacity,
                1
            );

            this.addSection(crossListedSection);
            this.assignSectionToSlot(crossListedSection.id, room, day, timeBlock);

            alert(`Created ${displayName} and cross-listed ${crossListedSection.getDisplayName(crossListedCode)}`);
        }

        // Re-render
        this.renderScheduleGrid();
        this.renderCourseCatalog();

        // Auto-save after creating cross-listed sections
        this.saveCurrentSchedule();
    }

    moveSection(sectionId, targetRoom, targetDay, targetTimeBlock) {
        const section = this.getSectionById(sectionId);
        if (!section) return;

        const course = this.getCourseById(section.courseId);
        if (!course) return;

        const displayName = section.getDisplayName(course.code);

        // Find the source location
        let sourceRoom = null, sourceDay = null, sourceTimeBlock = null;
        for (let slotKey in this.schedule) {
            const sectionIds = this.schedule[slotKey] || [];
            if (sectionIds.includes(sectionId)) {
                [sourceRoom, sourceDay, sourceTimeBlock] = slotKey.split('|');
                break;
            }
        }

        // Check for faculty conflicts
        const conflictCheck = this.checkFacultyConflict(
            section.instructor,
            targetDay,
            targetTimeBlock,
            sectionId
        );

        if (conflictCheck.conflict) {
            const conflictCourse = conflictCheck.conflictingCourse;
            const conflictSection = conflictCheck.conflictingSection;
            const conflictDisplayName = conflictSection.getDisplayName(conflictCourse.code);

            alert(
                `Faculty Conflict!\n\n` +
                `${section.instructor} is already teaching "${conflictDisplayName}" ` +
                `in ${conflictCheck.conflictingRoom} at this time.\n\n` +
                `Please choose a different time slot.`
            );
            return;
        }

        // Update enrollment if room changed
        const roomCapacity = this.config.getRoomCapacity(targetRoom);
        section.enrollment = roomCapacity;

        // Remove from previous slot
        if (sourceRoom && sourceDay && sourceTimeBlock) {
            this.removeSectionFromSlot(sourceRoom, sourceDay, sourceTimeBlock, sectionId);
        }

        // Assign to new slot
        this.assignSectionToSlot(sectionId, targetRoom, targetDay, targetTimeBlock);

        // Re-render
        this.renderScheduleGrid();

        // Auto-save after moving section
        this.saveCurrentSchedule();
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

    resetAddCourseModal() {
        // Reset editing mode
        this.editingCourseId = null;

        // Reset modal title and button text
        document.querySelector('#addClassModal h2').textContent = 'Add New Course';
        document.querySelector('#addClassForm button[type="submit"]').textContent = 'Add Course';

        // Reset form
        document.getElementById('addClassForm').reset();
    }

    editCourse(courseId) {
        const course = this.getCourseById(courseId);
        if (!course) return;

        // Set editing mode
        this.editingCourseId = courseId;

        // Update modal title
        document.querySelector('#addClassModal h2').textContent = 'Edit Course';

        // Populate form with existing data
        document.getElementById('className').value = course.code;
        document.getElementById('classTitle').value = course.title;
        document.getElementById('classCredits').value = course.credits || 3;

        // Hide instructor and enrollment fields for course editing
        document.getElementById('instructor').parentElement.style.display = 'none';
        document.getElementById('enrollment').parentElement.style.display = 'none';
        document.getElementById('duration').parentElement.style.display = 'none';

        // Update button text
        const submitBtn = document.querySelector('#addClassForm button[type="submit"]');
        submitBtn.textContent = 'Update Course';

        // Show modal
        this.showModal('addClassModal');
    }

    editSection(sectionId) {
        const section = this.getSectionById(sectionId);
        if (!section) return;

        const course = this.getCourseById(section.courseId);
        if (!course) return;

        // Prompt for section number
        const newSectionNumber = prompt(
            `Edit Section ${section.getDisplayName(course.code)}\n\n` +
            `Section Number:`,
            section.sectionNumber
        );

        if (newSectionNumber === null) return; // User cancelled

        // Prompt for instructor
        const newInstructor = prompt(
            `Instructor:`,
            section.instructor === 'TBD' ? '' : section.instructor
        );

        if (newInstructor === null) return; // User cancelled

        // Prompt for enrollment
        const newEnrollment = prompt(
            `Enrollment:`,
            section.enrollment.toString()
        );

        if (newEnrollment === null) return; // User cancelled

        const enrollmentNum = parseInt(newEnrollment);
        if (isNaN(enrollmentNum) || enrollmentNum < 1) {
            alert('Invalid enrollment number');
            return;
        }

        const instructorName = newInstructor.trim() || 'TBD';

        // Check for faculty conflicts if instructor changed
        if (instructorName !== section.instructor && instructorName !== 'TBD') {
            // Find where this section is scheduled
            let room = null, day = null, timeBlock = null;
            for (let slotKey in this.schedule) {
                const sectionIds = this.schedule[slotKey] || [];
                if (sectionIds.includes(sectionId)) {
                    [room, day, timeBlock] = slotKey.split('|');
                    break;
                }
            }

            if (room && day && timeBlock) {
                const conflictCheck = this.checkFacultyConflict(instructorName, day, timeBlock, sectionId);
                if (conflictCheck.conflict) {
                    const conflictCourse = conflictCheck.conflictingCourse;
                    const conflictSection = conflictCheck.conflictingSection;
                    const conflictDisplayName = conflictSection.getDisplayName(conflictCourse.code);

                    const shouldContinue = confirm(
                        `Faculty Conflict Warning!\n\n` +
                        `${instructorName} is already teaching "${conflictDisplayName}" ` +
                        `in ${conflictCheck.conflictingRoom} at this time.\n\n` +
                        `Continue anyway?`
                    );
                    if (!shouldContinue) return;
                }
            }
        }

        section.sectionNumber = newSectionNumber;
        section.instructor = instructorName;
        section.enrollment = enrollmentNum;

        this.renderScheduleGrid();
        this.renderCourseCatalog();
        this.saveCurrentSchedule(); // Auto-save after editing section
        alert('Section updated successfully!');
    }

    handleAddCourse() {
        const code = document.getElementById('className').value.trim();
        const title = document.getElementById('classTitle').value.trim();
        const credits = parseInt(document.getElementById('classCredits').value) || 3;

        if (!code || !title) {
            alert('Please fill in all required fields (Course Code and Title)');
            return;
        }

        if (this.editingCourseId !== null) {
            // Edit mode - update existing course
            const course = this.getCourseById(this.editingCourseId);
            if (course) {
                course.code = code;
                course.title = title;
                course.credits = credits;
            }
        } else {
            // Add mode - create new course
            const newCourse = new Course(this.nextCourseId++, code, title, credits);
            this.addCourse(newCourse);
        }

        // Close modal and reset
        document.getElementById('addClassModal').style.display = 'none';
        this.resetAddCourseModal();

        // Show instructor and enrollment fields again
        document.getElementById('instructor').parentElement.style.display = '';
        document.getElementById('enrollment').parentElement.style.display = '';
        document.getElementById('duration').parentElement.style.display = '';

        // Re-render catalog and schedule grid
        this.renderCourseCatalog();
        this.renderScheduleGrid();

        // Auto-save after adding/editing course
        this.saveCurrentSchedule();
    }

    handleBulkImport() {
        const bulkData = document.getElementById('bulkClassData').value.trim();

        if (!bulkData) {
            alert('Please enter course data to import');
            return;
        }

        const lines = bulkData.split('\n').map(line => line.trim()).filter(line => line);
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        lines.forEach((line, index) => {
            // Parse line using pipe separator
            const parts = line.split('|').map(part => part.trim());

            if (parts.length < 2) {
                errors.push(`Line ${index + 1}: Needs at least Course Code and Title`);
                errorCount++;
                return;
            }

            const code = parts[0];
            const title = parts[1];
            const credits = parts[2] ? parseInt(parts[2]) : 3; // Optional credits field, defaults to 3

            // Validate data
            if (!code || !title) {
                errors.push(`Line ${index + 1}: Missing required fields`);
                errorCount++;
                return;
            }

            // Check for duplicate course code
            const duplicate = this.courses.find(c => c.code === code);
            if (duplicate) {
                errors.push(`Line ${index + 1}: Course ${code} already exists`);
                errorCount++;
                return;
            }

            // Create the course
            const newCourse = new Course(
                this.nextCourseId++,
                code,
                title,
                credits
            );
            this.addCourse(newCourse);
            successCount++;
        });

        // Show results
        let message = `Import completed!\n\nSuccessfully imported: ${successCount} courses`;
        if (errorCount > 0) {
            message += `\nErrors: ${errorCount}`;
            if (errors.length > 0) {
                message += '\n\nError details:\n' + errors.slice(0, 5).join('\n');
                if (errors.length > 5) {
                    message += `\n... and ${errors.length - 5} more errors`;
                }
            }
        }

        alert(message);

        // Close modal and reset
        document.getElementById('bulkImportModal').style.display = 'none';
        document.getElementById('bulkClassData').value = '';

        // Re-render
        this.renderCourseCatalog();

        // Auto-save after bulk import
        this.saveCurrentSchedule();
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
        this.renderCourseCatalog();

        // Auto-save after config update
        this.saveCurrentSchedule();
    }

    showReportsModal() {
        // Generate report data
        const reportData = this.generateReportData();

        // Populate report view
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = this.renderReportHTML(reportData);

        // Setup sorting functionality
        this.setupReportSorting();

        // Setup export handlers
        document.getElementById('exportReportCSV').onclick = () => this.exportReportCSV(reportData);
        document.getElementById('exportReportHTML').onclick = () => this.exportReportHTML(reportData);

        this.showModal('reportsModal');
    }

    generateReportData() {
        const scheduledSections = [];

        // Get scheduled sections
        for (let slotKey in this.schedule) {
            const [room, day, timeBlock] = slotKey.split('|');
            const sectionIds = this.schedule[slotKey] || [];

            for (let sectionId of sectionIds) {
                const section = this.getSectionById(sectionId);
                if (section) {
                    const course = this.getCourseById(section.courseId);
                    if (course) {
                        // Parse room into building and room number
                        const roomParts = room.split(' ');
                        const building = roomParts.length > 1 ? roomParts.slice(0, -1).join(' ') : room;
                        const roomNumber = roomParts.length > 1 ? roomParts[roomParts.length - 1] : '';

                        // Parse time block into start and end times
                        const timeParts = timeBlock.split('-').map(t => t.trim());
                        const startTime = timeParts[0] || '';
                        const endTime = timeParts[1] || '';

                        scheduledSections.push({
                            section,
                            course,
                            displayName: section.getDisplayName(course.code),
                            room,
                            building,
                            roomNumber,
                            day,
                            timeBlock,
                            startTime,
                            endTime
                        });
                    }
                }
            }
        }

        // Sort by various criteria
        const byCourse = [...scheduledSections].sort((a, b) => a.displayName.localeCompare(b.displayName));
        const byInstructor = [...scheduledSections].sort((a, b) => a.section.instructor.localeCompare(b.section.instructor));
        const byEnrollment = [...scheduledSections].sort((a, b) => b.section.enrollment - a.section.enrollment);

        // Get faculty conflict information
        const facultyConflicts = this.detectAllFacultyConflicts();

        // Calculate statistics
        const totalEnrollment = this.sections.reduce((sum, s) => sum + s.enrollment, 0);

        return {
            scheduledSections,
            byCourse,
            byInstructor,
            byEnrollment,
            facultyConflicts,
            totalCourses: this.courses.length,
            totalSections: this.sections.length,
            totalScheduled: scheduledSections.length,
            totalUnscheduled: this.sections.length - scheduledSections.length,
            totalEnrollment
        };
    }

    detectAllFacultyConflicts() {
        // Detect any existing faculty conflicts in the schedule
        const conflicts = [];
        const checked = new Set();

        for (let slotKey in this.schedule) {
            if (checked.has(slotKey)) continue;

            const [room, day, timeBlock] = slotKey.split('|');
            const sectionIds = this.schedule[slotKey] || [];

            for (let sectionId of sectionIds) {
                const section = this.getSectionById(sectionId);

                if (!section) continue;

                const conflictCheck = this.checkFacultyConflict(
                    section.instructor,
                    day,
                    timeBlock,
                    sectionId
                );

                if (conflictCheck.conflict) {
                    const course = this.getCourseById(section.courseId);
                    const conflictCourse = conflictCheck.conflictingCourse;
                    const conflictSection = conflictCheck.conflictingSection;

                    conflicts.push({
                        instructor: section.instructor,
                        day,
                        timeBlock,
                        section1: section,
                        course1: course,
                        displayName1: section.getDisplayName(course.code),
                        room1: room,
                        section2: conflictSection,
                        course2: conflictCourse,
                        displayName2: conflictSection.getDisplayName(conflictCourse.code),
                        room2: conflictCheck.conflictingRoom
                    });
                }
            }

            checked.add(slotKey);
        }

        return conflicts;
    }

    renderReportHTML(data) {
        let html = `
            <div class="report-section">
                <div class="report-header">
                    <h3 style="margin-bottom: 0.5rem;">Schedule Report</h3>
                    <div class="report-info">
                        <span><strong>Semester:</strong> ${this.semester} ${this.year}</span>
                        <span style="margin-left: 2rem;"><strong>Campus:</strong> ${this.campus}</span>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h3>Summary Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Total Courses</div>
                        <div class="stat-value">${data.totalCourses}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Sections</div>
                        <div class="stat-value">${data.totalSections}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Scheduled</div>
                        <div class="stat-value">${data.totalScheduled}</div>
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
                            <th>Section 1</th>
                            <th>Room 1</th>
                            <th>Section 2</th>
                            <th>Room 2</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.facultyConflicts.map(conflict => `
                            <tr style="background-color: #ffe6e6;">
                                <td><strong>${conflict.instructor}</strong></td>
                                <td>${conflict.day}</td>
                                <td>${conflict.timeBlock}</td>
                                <td>${conflict.displayName1}</td>
                                <td>${conflict.room1}</td>
                                <td>${conflict.displayName2}</td>
                                <td>${conflict.room2}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div class="report-section">
                <h3>Scheduled Sections</h3>
                <table class="report-table sortable-report" id="mainReportTable">
                    <thead>
                        <tr>
                            <th data-sort="courseId" class="sortable">Course ID <span class="sort-arrow">↕</span></th>
                            <th data-sort="title" class="sortable">Title <span class="sort-arrow">↕</span></th>
                            <th data-sort="crn" class="sortable">CRN <span class="sort-arrow">↕</span></th>
                            <th data-sort="credits" class="sortable">Credits <span class="sort-arrow">↕</span></th>
                            <th data-sort="days" class="sortable">Days <span class="sort-arrow">↕</span></th>
                            <th data-sort="startTime" class="sortable">Start Time <span class="sort-arrow">↕</span></th>
                            <th data-sort="endTime" class="sortable">End Time <span class="sort-arrow">↕</span></th>
                            <th data-sort="building" class="sortable">Building <span class="sort-arrow">↕</span></th>
                            <th data-sort="room" class="sortable">Room <span class="sort-arrow">↕</span></th>
                            <th data-sort="meetingType" class="sortable">Meeting Type <span class="sort-arrow">↕</span></th>
                            <th data-sort="instructor" class="sortable">Instructor <span class="sort-arrow">↕</span></th>
                            <th data-sort="enrollment" class="sortable">Max Enrollment <span class="sort-arrow">↕</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.scheduledSections.map(item => `
                            <tr>
                                <td>${item.displayName}</td>
                                <td>${item.course.title}</td>
                                <td></td>
                                <td>${item.course.credits || 3}</td>
                                <td>${item.day}</td>
                                <td>${item.startTime}</td>
                                <td>${item.endTime}</td>
                                <td>${item.building}</td>
                                <td>${item.roomNumber}</td>
                                <td>Lecture</td>
                                <td>${item.section.instructor}</td>
                                <td>${item.section.enrollment}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="report-section">
                <h3>Sections by Instructor</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Instructor</th>
                            <th>Section</th>
                            <th>Course Title</th>
                            <th>Enrollment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.byInstructor.map(item => `
                            <tr>
                                <td>${item.section.instructor}</td>
                                <td>${item.displayName}</td>
                                <td>${item.course.title}</td>
                                <td>${item.section.enrollment}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    setupReportSorting() {
        const table = document.getElementById('mainReportTable');
        if (!table) return;

        const headers = table.querySelectorAll('th.sortable');
        let currentSort = { column: null, direction: 'asc' };

        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.getAttribute('data-sort');
                const tbody = table.querySelector('tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));

                // Determine sort direction
                if (currentSort.column === sortKey) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.direction = 'asc';
                }
                currentSort.column = sortKey;

                // Map sort keys to column indices
                const columnMap = {
                    'courseId': 0,
                    'title': 1,
                    'crn': 2,
                    'credits': 3,
                    'days': 4,
                    'startTime': 5,
                    'endTime': 6,
                    'building': 7,
                    'room': 8,
                    'meetingType': 9,
                    'instructor': 10,
                    'enrollment': 11
                };

                const columnIndex = columnMap[sortKey];

                // Sort rows
                rows.sort((a, b) => {
                    const aValue = a.cells[columnIndex].textContent.trim();
                    const bValue = b.cells[columnIndex].textContent.trim();

                    // Check if values are numbers
                    const aNum = parseFloat(aValue);
                    const bNum = parseFloat(bValue);

                    let comparison = 0;
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        // Numeric comparison
                        comparison = aNum - bNum;
                    } else {
                        // String comparison
                        comparison = aValue.localeCompare(bValue);
                    }

                    return currentSort.direction === 'asc' ? comparison : -comparison;
                });

                // Clear tbody and re-add sorted rows
                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));

                // Update header styling
                headers.forEach(h => {
                    h.classList.remove('sorted-asc', 'sorted-desc');
                });
                header.classList.add(`sorted-${currentSort.direction}`);
            });
        });
    }

    exportReportCSV(data) {
        // Add schedule info header
        let csv = `Semester: ${this.semester} ${this.year}\n`;
        csv += `Campus: ${this.campus}\n`;
        csv += `\n`; // Blank line
        csv += 'Course ID,Title,CRN,Credits,Days,Start Time,End Time,Building,Room,Meeting Type,Instructor,Max Enrollment\n';

        // Add all scheduled sections
        data.scheduledSections.forEach(item => {
            csv += `"${item.displayName}","${item.course.title}","",${item.course.credits || 3},"${item.day}","${item.startTime}","${item.endTime}","${item.building}","${item.roomNumber}","Lecture","${item.section.instructor}",${item.section.enrollment}\n`;
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

    // Spreadsheet Import Methods

    parseCourseId(courseIdString) {
        // Handle formats: "CSCI-1100-001", "CSCI 1100-001", "CSCI1100-001"
        // Also handle numbers from Excel (convert to string)
        if (!courseIdString && courseIdString !== 0) {
            throw new Error('Invalid course ID');
        }

        // Convert to string if it's a number
        const str = String(courseIdString);
        const trimmed = str.trim();

        // Find last dash or last space followed by digits
        const match = trimmed.match(/^(.+?)[-\s](\d{3})$/);

        if (!match) {
            throw new Error(`Cannot parse course ID: ${courseIdString}`);
        }

        const courseCode = match[1].trim();
        const sectionNumber = match[2];

        return { courseCode, sectionNumber };
    }

    parseDays(daysString) {
        // Convert "MW", "TR", "MWF", etc. to ["Monday", "Wednesday", ...]
        if (!daysString) {
            return [];
        }

        // Convert to string if needed
        const str = String(daysString);
        const cleaned = str.trim().toUpperCase();

        if (!cleaned) {
            return [];
        }

        const dayMap = {
            'M': 'Monday',
            'T': 'Tuesday',
            'W': 'Wednesday',
            'R': 'Thursday',
            'F': 'Friday'
        };

        const days = [];

        for (let char of cleaned) {
            if (dayMap[char]) {
                if (!days.includes(dayMap[char])) {
                    days.push(dayMap[char]);
                }
            }
        }

        return days;
    }

    parseTime(timeValue) {
        // Handle both Excel decimal time format and text time strings
        // Excel time: 0.333333 = 8:00 AM, 0.5 = 12:00 PM
        // Text time: "8:00 AM", "12:30 PM"

        if (timeValue === null || timeValue === undefined || timeValue === '') {
            throw new Error('Missing time value');
        }

        let hours24, minutes;

        // Check if it's a number (Excel decimal time format)
        if (typeof timeValue === 'number') {
            // Excel stores times as fractions of a day
            // 0.5 = 12 hours = noon
            const totalMinutes = Math.round(timeValue * 24 * 60);
            hours24 = Math.floor(totalMinutes / 60) % 24; // Ensure within 24 hours
            minutes = totalMinutes % 60;
        } else if (typeof timeValue === 'string') {
            // Try to parse as text time
            const trimmed = timeValue.trim();

            if (!trimmed) {
                throw new Error('Empty time string');
            }

            // Match patterns like "8:00 AM", "12:30 PM", "8:00AM", etc.
            const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

            if (!match) {
                throw new Error(`Cannot parse time: ${timeValue}`);
            }

            let hrs = parseInt(match[1]);
            minutes = parseInt(match[2]);
            const meridiem = match[3].toUpperCase();

            // Convert to 24-hour for sorting/comparison
            if (meridiem === 'PM' && hrs !== 12) {
                hours24 = hrs + 12;
            } else if (meridiem === 'AM' && hrs === 12) {
                hours24 = 0;
            } else {
                hours24 = hrs;
            }
        } else {
            throw new Error(`Invalid time value type: ${typeof timeValue}`);
        }

        // Return standardized 12-hour format for display
        const displayHours = hours24 > 12 ? hours24 - 12 : (hours24 === 0 ? 12 : hours24);
        const displayMeridiem = hours24 >= 12 ? 'PM' : 'AM';
        const displayMinutes = minutes.toString().padStart(2, '0');

        return {
            display: `${displayHours}:${displayMinutes} ${displayMeridiem}`,
            hours24: hours24,
            minutes: minutes,
            totalMinutes: hours24 * 60 + minutes
        };
    }

    createTimeBlock(startTime, endTime) {
        // Format as "8:00 AM - 9:15 AM"
        const start = this.parseTime(startTime);
        const end = this.parseTime(endTime);

        return `${start.display} - ${end.display}`;
    }

    matchOrCreateRoom(building, roomNumber, autoCreate = true) {
        // Combine building and room: "Nicks" + "302" → "Nicks 302"
        // Handle empty values and convert to string
        const buildingStr = building ? String(building).trim() : '';
        const roomStr = roomNumber ? String(roomNumber).trim() : '';

        if (!buildingStr && !roomStr) {
            throw new Error('Missing room information');
        }

        const roomName = buildingStr && roomStr
            ? `${buildingStr} ${roomStr}`
            : (buildingStr || roomStr);

        // Check if room exists
        if (this.config.rooms.includes(roomName)) {
            return roomName;
        }

        // Auto-create if enabled
        if (autoCreate) {
            this.config.rooms.push(roomName);
            this.config.roomOrder.push(roomName);
            this.config.roomCapacities[roomName] = 30; // Default capacity
            console.log(`Auto-created room: ${roomName}`);
            return roomName;
        }

        throw new Error(`Room not found: ${roomName}`);
    }

    matchOrCreateTimeBlock(startTime, endTime, day, autoCreate = true) {
        // Try exact match first
        const timeBlock = this.createTimeBlock(startTime, endTime);
        const existingBlocks = this.config.getTimeBlocksForDay(day);

        if (existingBlocks.includes(timeBlock)) {
            return timeBlock;
        }

        // Auto-create if enabled
        if (autoCreate) {
            if (!this.config.timeBlocksByDay[day]) {
                this.config.timeBlocksByDay[day] = [];
            }

            // Insert in chronological order
            const blocks = this.config.timeBlocksByDay[day];
            const parsed = this.parseTime(startTime);

            let insertIndex = blocks.length;
            for (let i = 0; i < blocks.length; i++) {
                const blockStart = blocks[i].split(' - ')[0];
                const blockParsed = this.parseTime(blockStart);
                if (parsed.totalMinutes < blockParsed.totalMinutes) {
                    insertIndex = i;
                    break;
                }
            }

            blocks.splice(insertIndex, 0, timeBlock);
            console.log(`Auto-created time block for ${day}: ${timeBlock}`);
            return timeBlock;
        }

        throw new Error(`Time block not found for ${day}: ${timeBlock}`);
    }

    processSpreadsheetData(rows) {
        const results = {
            coursesMap: new Map(),  // courseCode → Course object
            sections: [],
            scheduleEntries: [],
            errors: [],
            warnings: [],
            roomsCreated: new Set(),
            timeBlocksCreated: new Set()
        };

        rows.forEach((row, index) => {
            const rowNum = index + 2; // Account for header row and 0-indexing

            try {
                // 1. Validate required fields
                if (!row['Course ID'] && row['Course ID'] !== 0) {
                    throw new Error('Missing Course ID');
                }
                if (!row['Title']) {
                    throw new Error('Missing Title');
                }

                // 2. Parse course ID
                let courseCode, sectionNumber;
                try {
                    const parsed = this.parseCourseId(row['Course ID']);
                    courseCode = parsed.courseCode;
                    sectionNumber = parsed.sectionNumber;
                } catch (error) {
                    throw new Error(`Invalid Course ID format: ${error.message}`);
                }

                // 3. Get or create course
                let course = results.coursesMap.get(courseCode);
                if (!course) {
                    const credits = row['Credits'] ? parseInt(row['Credits']) : 3;
                    course = new Course(
                        this.nextCourseId++,
                        courseCode,
                        String(row['Title']),
                        isNaN(credits) ? 3 : credits
                    );
                    results.coursesMap.set(courseCode, course);
                }

                // 4. Create section
                const enrollment = row['Max Enrollment'] ? parseInt(row['Max Enrollment']) : 30;
                const crn = row['CRN'] ? String(row['CRN']) : null;
                const instructor = row['Instructor'] ? String(row['Instructor']) : 'TBD';

                const section = new Section(
                    this.nextSectionId++,
                    course.id,
                    sectionNumber,
                    instructor,
                    isNaN(enrollment) ? 30 : enrollment,
                    1, // duration
                    crn
                );
                results.sections.push(section);

                // 5. Parse days
                const days = this.parseDays(row['Days']);
                if (days.length === 0) {
                    results.warnings.push(`Row ${rowNum} (${courseCode}-${sectionNumber}): No valid days found - section created but not scheduled`);
                    return; // Skip scheduling but section is created
                }

                // 6. Validate time fields before processing schedule
                if (!row['Start Time'] && row['Start Time'] !== 0) {
                    results.warnings.push(`Row ${rowNum} (${courseCode}-${sectionNumber}): Missing Start Time - section created but not scheduled`);
                    return;
                }
                if (!row['End Time'] && row['End Time'] !== 0) {
                    results.warnings.push(`Row ${rowNum} (${courseCode}-${sectionNumber}): Missing End Time - section created but not scheduled`);
                    return;
                }

                // 7. Match or create room
                let room;
                try {
                    room = this.matchOrCreateRoom(row['Building'], row['Room'], true);
                    if (!this.config.rooms.includes(room)) {
                        results.roomsCreated.add(room);
                    }
                } catch (error) {
                    results.warnings.push(`Row ${rowNum} (${courseCode}-${sectionNumber}): ${error.message} - section created but not scheduled`);
                    return;
                }

                // 8. Process schedule for each day
                days.forEach(day => {
                    try {
                        // Ensure day exists in config
                        if (!this.config.days.includes(day)) {
                            this.config.days.push(day);
                        }

                        // Parse start and end times
                        const startTime = this.parseTime(row['Start Time']);
                        const endTime = this.parseTime(row['End Time']);

                        // Find closest grid block for start time
                        const startBlockIndex = this.config.findClosestTimeBlock(startTime.hours24, startTime.minutes);

                        // Calculate duration in minutes
                        const durationMinutes = endTime.totalMinutes - startTime.totalMinutes;

                        // Calculate how many grid blocks this spans
                        const blockSpan = this.config.calculateBlockSpan(durationMinutes);

                        // Create schedule entry with grid positioning
                        results.scheduleEntries.push({
                            sectionId: section.id,
                            room: room,
                            day: day,
                            startBlockIndex: startBlockIndex,
                            blockSpan: blockSpan
                        });

                    } catch (error) {
                        results.errors.push(`Row ${rowNum} (${courseCode}-${sectionNumber}), ${day}: ${error.message}`);
                    }
                });

            } catch (error) {
                results.errors.push(`Row ${rowNum}: ${error.message}`);
            }
        });

        return results;
    }

    handleSpreadsheetFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Store file for later import
        this.selectedSpreadsheetFile = file;

        // Read and preview
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet);

                // Show preview
                this.showImportPreview(rows.slice(0, 5));

                // Enable import button
                document.getElementById('confirmSpreadsheetImport').disabled = false;

            } catch (error) {
                alert(`Error reading file: ${error.message}`);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    showImportPreview(rows) {
        const previewSection = document.getElementById('importPreviewSection');
        const previewDiv = document.getElementById('importPreview');

        if (rows.length === 0) {
            previewDiv.innerHTML = '<p>No data found in file</p>';
            return;
        }

        // Build preview table
        let html = '<table class="report-table" style="font-size: 0.8rem;"><thead><tr>';

        // Headers
        const headers = Object.keys(rows[0]);
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Rows
        rows.forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                html += `<td>${row[header] || ''}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        previewDiv.innerHTML = html;
        previewSection.style.display = 'block';
    }

    confirmSpreadsheetImport() {
        if (!this.selectedSpreadsheetFile) {
            alert('No file selected');
            return;
        }

        const clearExisting = document.getElementById('clearExistingData').checked;

        // Show processing message
        const statusDiv = document.getElementById('importStatus');
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<p>Processing spreadsheet...</p>';

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet);

                // Process data
                this.importSpreadsheet(rows, { clearExisting });

            } catch (error) {
                alert(`Error importing file: ${error.message}`);
                statusDiv.style.display = 'none';
            }
        };

        reader.readAsArrayBuffer(this.selectedSpreadsheetFile);
    }

    importSpreadsheet(rows, options = {}) {
        // Process data
        const results = this.processSpreadsheetData(rows);

        // Show errors if any
        if (results.errors.length > 0) {
            const proceed = confirm(
                `Found ${results.errors.length} errors.\n\n` +
                results.errors.slice(0, 5).join('\n') +
                (results.errors.length > 5 ? `\n... and ${results.errors.length - 5} more` : '') +
                `\n\nContinue with valid rows?`
            );

            if (!proceed) {
                document.getElementById('importStatus').style.display = 'none';
                return;
            }
        }

        // Clear existing if requested
        if (options.clearExisting) {
            this.courses = [];
            this.sections = [];
            this.schedulePlacements = [];
        }

        // Add courses
        results.coursesMap.forEach(course => {
            this.addCourse(course);
        });

        // Add sections
        results.sections.forEach(section => {
            this.addSection(section);
        });

        // Add schedule placements
        results.scheduleEntries.forEach(entry => {
            this.addPlacement(
                entry.sectionId,
                entry.room,
                entry.day,
                entry.startBlockIndex,
                entry.blockSpan
            );
        });

        // Re-render
        this.renderScheduleGrid();
        this.renderCourseCatalog();

        // Save
        this.saveCurrentSchedule();

        // Show summary
        let message = `Import completed!\n\n`;
        message += `Courses: ${results.coursesMap.size}\n`;
        message += `Sections: ${results.sections.length}\n`;
        message += `Schedule entries: ${results.scheduleEntries.length}\n`;

        if (results.roomsCreated.size > 0) {
            message += `\nRooms created: ${results.roomsCreated.size}`;
        }

        if (results.timeBlocksCreated.size > 0) {
            message += `\nTime blocks created: ${results.timeBlocksCreated.size}`;
        }

        if (results.warnings.length > 0) {
            message += `\n\nWarnings: ${results.warnings.length}`;
        }

        if (results.errors.length > 0) {
            message += `\nErrors: ${results.errors.length}`;
        }

        alert(message);

        // Close modal
        document.getElementById('importSpreadsheetModal').style.display = 'none';
        document.getElementById('importStatus').style.display = 'none';

        // Reset file input
        document.getElementById('spreadsheetFileInput').value = '';
        document.getElementById('confirmSpreadsheetImport').disabled = true;
        document.getElementById('importPreviewSection').style.display = 'none';
        this.selectedSpreadsheetFile = null;
    }

    clearSchedule() {
        // Clear all sections from the schedule
        this.sections = [];
        this.schedulePlacements = [];

        // Re-render to update the course catalog counts
        this.renderScheduleGrid();
        this.renderCourseCatalog();

        // Auto-save after clearing
        this.saveCurrentSchedule();
    }

    syncCatalog() {
        // Synchronize course catalog with schedule data
        let orphanedEntries = 0;
        let fixedEntries = 0;

        // Check for orphaned schedule entries (sections that don't exist)
        const validSchedule = {};
        for (let slotKey in this.schedule) {
            const sectionIds = this.schedule[slotKey] || [];
            const validSectionIds = sectionIds.filter(sectionId => {
                const section = this.getSectionById(sectionId);
                if (!section) {
                    orphanedEntries++;
                    return false;
                }

                // Also verify the course exists
                const course = this.getCourseById(section.courseId);
                if (!course) {
                    orphanedEntries++;
                    return false;
                }

                return true;
            });

            if (validSectionIds.length > 0) {
                validSchedule[slotKey] = validSectionIds;
            } else if (sectionIds.length > 0) {
                // This slot had invalid entries that were removed
                fixedEntries++;
            }
        }

        // Update schedule with cleaned data
        this.schedule = validSchedule;

        // Check for sections that reference non-existent courses
        const validSections = this.sections.filter(section => {
            const course = this.getCourseById(section.courseId);
            if (!course) {
                orphanedEntries++;
                return false;
            }
            return true;
        });

        if (validSections.length !== this.sections.length) {
            this.sections = validSections;
            fixedEntries++;
        }

        // Re-render everything to refresh counts
        this.renderScheduleGrid();
        this.renderCourseCatalog();

        // Save the cleaned data
        if (orphanedEntries > 0 || fixedEntries > 0) {
            this.saveCurrentSchedule();
        }

        // Provide feedback
        let message = 'Catalog synchronized successfully!\n\n';
        message += `Total courses: ${this.courses.length}\n`;
        message += `Total sections: ${this.sections.length}\n`;

        const scheduledCount = Object.keys(this.schedule).reduce((count, slotKey) => {
            return count + (this.schedule[slotKey] || []).length;
        }, 0);
        message += `Scheduled instances: ${scheduledCount}\n`;

        if (orphanedEntries > 0) {
            message += `\n⚠️ Cleaned ${orphanedEntries} orphaned entries`;
        }

        if (fixedEntries > 0) {
            message += `\n✓ Fixed ${fixedEntries} schedule slots`;
        }

        if (orphanedEntries === 0 && fixedEntries === 0) {
            message += '\n✓ No issues found - data is clean';
        }

        alert(message);
    }

    // Multi-schedule management methods
    getScheduleKey() {
        // Create a unique key for the current semester/year/campus combination
        return `${this.semester}-${this.year}-${this.campus}`;
    }

    saveCurrentSchedule() {
        // Save current schedule to localStorage
        const scheduleKey = this.getScheduleKey();
        const scheduleData = {
            config: this.config,
            courses: this.courses,
            sections: this.sections,
            schedule: this.schedule,
            nextCourseId: this.nextCourseId,
            nextSectionId: this.nextSectionId,
            semester: this.semester,
            year: this.year,
            campus: this.campus,
            lastModified: new Date().toISOString()
        };

        try {
            localStorage.setItem(`schedule_${scheduleKey}`, JSON.stringify(scheduleData));
            console.log(`Schedule saved: ${scheduleKey}`);
        } catch (error) {
            console.error('Error saving schedule to localStorage:', error);
            alert('Error saving schedule. Storage may be full.');
        }
    }

    switchSchedule() {
        // Load schedule for the current semester/year/campus combination
        const scheduleKey = this.getScheduleKey();
        const savedData = localStorage.getItem(`schedule_${scheduleKey}`);

        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.loadScheduleData(data);
                console.log(`Schedule loaded: ${scheduleKey}`);
            } catch (error) {
                console.error('Error loading schedule:', error);
                this.initializeEmptySchedule();
            }
        } else {
            // No schedule exists for this combination, initialize empty
            console.log(`No schedule found for ${scheduleKey}, initializing empty schedule`);
            this.initializeEmptySchedule();
        }

        this.updateScheduleInfoUI();
        this.renderScheduleGrid();
        this.renderCourseCatalog();
    }

    initializeEmptySchedule() {
        // Keep the config but reset courses, sections, and schedule
        this.courses = [];
        this.sections = [];
        this.schedule = {};
        // Don't reset IDs to avoid conflicts
    }

    loadScheduleData(data) {
        // Load schedule data from an object
        if (data.config) {
            this.config = new ScheduleConfig();
            this.config.rooms = data.config.rooms || this.config.rooms;
            this.config.days = data.config.days || this.config.days;
            this.config.roomOrder = data.config.roomOrder || [...this.config.rooms];
            this.config.roomCapacities = data.config.roomCapacities || this.config.roomCapacities;
            this.config.timeBlocksByDay = data.config.timeBlocksByDay || this.config.timeBlocksByDay;
        }

        if (data.courses && data.sections) {
            this.courses = data.courses.map(c => new Course(c.id, c.code, c.title, c.credits));
            this.sections = data.sections.map(s => new Section(s.id, s.courseId, s.sectionNumber, s.instructor, s.enrollment, s.duration, s.crn));
            this.nextCourseId = data.nextCourseId || this.nextCourseId;
            this.nextSectionId = data.nextSectionId || this.nextSectionId;
        }

        // Load schedule placements (new format)
        if (data.schedulePlacements) {
            this.schedulePlacements = data.schedulePlacements;
            this.nextPlacementId = Math.max(...this.schedulePlacements.map(p => p.id), 0) + 1;
        } else if (data.schedule) {
            // Migrate old format - not fully supported, will lose time information
            // Best effort: place at first available slot
            this.schedulePlacements = [];
            for (let slotKey in data.schedule) {
                const sectionIds = Array.isArray(data.schedule[slotKey]) ? data.schedule[slotKey] : [data.schedule[slotKey]];
                sectionIds.forEach(sectionId => {
                    // Place at first time block with span of 1 (legacy behavior)
                    this.addPlacement(sectionId, 'Unknown', 'Monday', 0, 1);
                });
            }
        }

        this.semester = data.semester || this.semester;
        this.year = data.year || this.year;
        this.campus = data.campus || this.campus;
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate the data
                if (!data.semester || !data.year || !data.campus) {
                    alert('Invalid schedule file: missing semester, year, or campus information.');
                    return;
                }

                // Ask user how to import
                const options = [
                    `1. Load into current schedule (${this.semester} ${this.year} - ${this.campus})`,
                    `2. Load as new schedule (${data.semester} ${data.year} - ${data.campus})`,
                    `3. Cancel`
                ].join('\n');

                const choice = prompt(
                    `Import schedule from:\n${data.semester} ${data.year} - ${data.campus}\n\n` +
                    `Last modified: ${data.lastModified || data.exportDate || 'Unknown'}\n\n` +
                    `Choose import option:\n${options}\n\n` +
                    `Enter 1, 2, or 3:`,
                    '2'
                );

                if (choice === '1') {
                    // Load into current schedule (overwrite)
                    if (confirm(`This will overwrite your current schedule (${this.semester} ${this.year} - ${this.campus}). Continue?`)) {
                        // Keep current semester/year/campus, but load the data
                        const currentSemester = this.semester;
                        const currentYear = this.year;
                        const currentCampus = this.campus;

                        this.loadScheduleData(data);

                        // Restore current semester/year/campus
                        this.semester = currentSemester;
                        this.year = currentYear;
                        this.campus = currentCampus;

                        this.saveCurrentSchedule();
                        this.updateScheduleInfoUI();
                        this.renderScheduleGrid();
                        this.renderCourseCatalog();
                        alert('Schedule imported successfully into current slot!');
                    }
                } else if (choice === '2') {
                    // Load as new schedule (use the semester/year/campus from the file)
                    const targetKey = `${data.semester}-${data.year}-${data.campus}`;
                    const existing = localStorage.getItem(`schedule_${targetKey}`);

                    if (existing) {
                        if (!confirm(`A schedule already exists for ${data.semester} ${data.year} - ${data.campus}. Overwrite it?`)) {
                            return;
                        }
                    }

                    // Save current schedule first
                    this.saveCurrentSchedule();

                    // Load the imported data
                    this.loadScheduleData(data);
                    this.saveCurrentSchedule();
                    this.updateScheduleInfoUI();
                    this.renderScheduleGrid();
                    this.renderCourseCatalog();
                    alert(`Schedule imported successfully as ${data.semester} ${data.year} - ${data.campus}!`);
                }
            } catch (error) {
                console.error('Error importing schedule:', error);
                alert('Error importing schedule file. Please check the file format.');
            }

            // Reset file input
            event.target.value = '';
        };

        reader.readAsText(file);
    }

    getAllSchedules() {
        // Get all saved schedules from localStorage
        const schedules = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('schedule_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const scheduleKey = key.replace('schedule_', '');
                    schedules.push({
                        key: scheduleKey,
                        semester: data.semester,
                        year: data.year,
                        campus: data.campus,
                        lastModified: data.lastModified || 'Unknown',
                        courseCount: data.courses ? data.courses.length : 0,
                        sectionCount: data.sections ? data.sections.length : 0
                    });
                } catch (error) {
                    console.error(`Error parsing schedule ${key}:`, error);
                }
            }
        }

        // Sort by year and semester
        const semesterOrder = { 'Spring': 1, 'Summer': 2, 'Fall': 3 };
        schedules.sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return (semesterOrder[b.semester] || 0) - (semesterOrder[a.semester] || 0);
        });

        return schedules;
    }

    showManageSchedulesModal() {
        // Show current schedule info
        document.getElementById('currentScheduleInfo').textContent =
            `${this.semester} ${this.year} - ${this.campus}`;

        // Populate schedules list
        this.renderSchedulesList();

        // Setup event listeners for the modal
        document.getElementById('refreshSchedulesList').onclick = () => this.renderSchedulesList();
        document.getElementById('exportCurrentSchedule').onclick = () => this.exportToJSON();
        document.getElementById('importScheduleFile').onclick = () => {
            document.getElementById('importFileInput').click();
        };

        this.showModal('manageSchedulesModal');
    }

    renderSchedulesList() {
        const container = document.getElementById('schedulesList');
        const schedules = this.getAllSchedules();
        const currentKey = this.getScheduleKey();

        if (schedules.length === 0) {
            container.innerHTML = '<p class="empty-state">No saved schedules found.</p>';
            return;
        }

        let html = '<table class="report-table"><thead><tr>';
        html += '<th>Semester</th><th>Year</th><th>Campus</th>';
        html += '<th>Courses</th><th>Sections</th><th>Last Modified</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        schedules.forEach(schedule => {
            const isCurrent = schedule.key === currentKey;
            const rowClass = isCurrent ? 'style="background-color: rgba(255, 199, 44, 0.2);"' : '';

            html += `<tr ${rowClass}>`;
            html += `<td><strong>${schedule.semester}</strong> ${isCurrent ? '(Current)' : ''}</td>`;
            html += `<td>${schedule.year}</td>`;
            html += `<td>${schedule.campus}</td>`;
            html += `<td>${schedule.courseCount}</td>`;
            html += `<td>${schedule.sectionCount}</td>`;
            html += `<td>${new Date(schedule.lastModified).toLocaleString()}</td>`;
            html += '<td>';

            if (!isCurrent) {
                html += `<button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;" onclick="scheduler.loadScheduleByKey('${schedule.key}')">Load</button> `;
            }

            html += `<button class="btn btn-success" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;" onclick="scheduler.exportScheduleByKey('${schedule.key}')">Export</button> `;
            html += `<button class="btn btn-danger" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;" onclick="scheduler.deleteSchedule('${schedule.key}')">Delete</button>`;
            html += '</td></tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    loadScheduleByKey(scheduleKey) {
        const savedData = localStorage.getItem(`schedule_${scheduleKey}`);
        if (!savedData) {
            alert('Schedule not found!');
            return;
        }

        try {
            // Save current schedule first
            this.saveCurrentSchedule();

            // Load the selected schedule
            const data = JSON.parse(savedData);
            this.loadScheduleData(data);

            this.updateScheduleInfoUI();
            this.renderScheduleGrid();
            this.renderCourseCatalog();

            // Close modal
            document.getElementById('manageSchedulesModal').style.display = 'none';

            alert(`Loaded schedule: ${this.semester} ${this.year} - ${this.campus}`);
        } catch (error) {
            console.error('Error loading schedule:', error);
            alert('Error loading schedule.');
        }
    }

    exportScheduleByKey(scheduleKey) {
        const savedData = localStorage.getItem(`schedule_${scheduleKey}`);
        if (!savedData) {
            alert('Schedule not found!');
            return;
        }

        try {
            const data = JSON.parse(savedData);
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `schedule-${data.semester}-${data.year}-${data.campus.replace(/\s+/g, '-')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert(`Exported: ${data.semester} ${data.year} - ${data.campus}`);
        } catch (error) {
            console.error('Error exporting schedule:', error);
            alert('Error exporting schedule.');
        }
    }

    deleteSchedule(scheduleKey) {
        const currentKey = this.getScheduleKey();
        if (scheduleKey === currentKey) {
            alert('Cannot delete the currently active schedule. Switch to a different schedule first.');
            return;
        }

        const savedData = localStorage.getItem(`schedule_${scheduleKey}`);
        if (!savedData) {
            alert('Schedule not found!');
            return;
        }

        try {
            const data = JSON.parse(savedData);
            if (confirm(`Delete schedule for ${data.semester} ${data.year} - ${data.campus}?\n\nThis cannot be undone.`)) {
                localStorage.removeItem(`schedule_${scheduleKey}`);
                this.renderSchedulesList();
                alert('Schedule deleted.');
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('Error deleting schedule.');
        }
    }

    async saveToServer() {
        const data = {
            config: this.config,
            courses: this.courses,
            sections: this.sections,
            schedule: this.schedule,
            nextCourseId: this.nextCourseId,
            nextSectionId: this.nextSectionId,
            semester: this.semester,
            year: this.year,
            campus: this.campus
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

                    // Handle room capacities
                    if (data.config.roomCapacities) {
                        this.config.roomCapacities = data.config.roomCapacities;
                    } else {
                        // Initialize default capacities for all rooms
                        this.config.rooms.forEach(room => {
                            if (!this.config.roomCapacities[room]) {
                                this.config.roomCapacities[room] = 30;
                            }
                        });
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

                // Load courses and sections
                if (data.courses && data.sections) {
                    // New format
                    this.courses = data.courses.map(c => new Course(c.id, c.code, c.title, c.credits));
                    this.sections = data.sections.map(s => new Section(s.id, s.courseId, s.sectionNumber, s.instructor, s.enrollment, s.duration, s.crn));
                    this.nextCourseId = data.nextCourseId || this.nextCourseId;
                    this.nextSectionId = data.nextSectionId || this.nextSectionId;
                } else if (data.classes) {
                    // Old format - migrate classes to courses (without sections)
                    this.courses = [];
                    this.sections = [];
                    // Just create empty catalog - user can add courses manually
                    console.log('Migrated from old class-based format');
                }

                // Load schedule with backward compatibility
                if (data.schedule) {
                    this.schedule = {};
                    for (let slotKey in data.schedule) {
                        const value = data.schedule[slotKey];
                        // Check if it's the new array format or old single-value format
                        if (Array.isArray(value)) {
                            this.schedule[slotKey] = value;
                        } else {
                            // Convert old single-value to array
                            this.schedule[slotKey] = [value];
                        }
                    }
                } else {
                    this.schedule = {};
                }

                // Load semester, year, and campus with defaults
                this.semester = data.semester || 'Fall';
                this.year = data.year || new Date().getFullYear();
                this.campus = data.campus || 'Main Campus';

                // Update the UI to reflect loaded values
                this.updateScheduleInfoUI();

                this.renderScheduleGrid();
                this.renderCourseCatalog();

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
            courses: this.courses,
            sections: this.sections,
            schedulePlacements: this.schedulePlacements,
            semester: this.semester,
            year: this.year,
            campus: this.campus,
            exportDate: new Date().toISOString()
        };

        // Convert schedule to readable format
        const readableSchedule = [];
        for (let placement of this.schedulePlacements) {
            const section = this.getSectionById(placement.sectionId);
            if (section) {
                const course = this.getCourseById(section.courseId);
                if (course) {
                    const startBlock = this.config.timeBlocks[placement.startBlockIndex];
                    const endBlockIndex = placement.startBlockIndex + placement.blockSpan;
                    const endBlock = this.config.timeBlocks[Math.min(endBlockIndex, this.config.timeBlocks.length - 1)];
                    const timeDisplay = startBlock && endBlock ? `${startBlock.label} - ${endBlock.label}` : '';

                    readableSchedule.push({
                        room: placement.room,
                        day: placement.day,
                        time: timeDisplay,
                        section: {
                            displayName: section.getDisplayName(course.code),
                            courseTitle: course.title,
                            instructor: section.instructor,
                            enrollment: section.enrollment,
                            crn: section.crn
                        }
                    });
                }
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
