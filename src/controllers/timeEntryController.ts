// backend/src/controllers/timeEntryController.ts

import { Response, NextFunction } from 'express';
import { timeEntryService } from '../services/timeEntryService';
import { AuthRequest } from '../types/express';

export const createTimeEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, jobId, date, hours, isRdActivity, rdDescription } = req.body;

    // Validation
    if (!employeeId || !jobId || !date || hours === undefined) {
      res.status(400).json({ 
        message: 'Missing required fields: employeeId, jobId, date, hours' 
      });
      return;
    }

    const timeEntry = await timeEntryService.createTimeEntry({
      employeeId,
      jobId,
      date,
      hours: parseFloat(hours),
      isRdActivity: Boolean(isRdActivity),
      rdDescription,
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    console.error('Error creating time entry:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getTimeEntries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, jobId, startDate, endDate, rdOnly } = req.query;

    const filters = {
      employeeId: employeeId as string,
      jobId: jobId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      rdOnly: rdOnly === 'true',
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined || filters[key as keyof typeof filters] === '') {
        delete filters[key as keyof typeof filters];
      }
    });

    const timeEntries = await timeEntryService.getTimeEntries(filters);
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTimeEntryById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const timeEntry = await timeEntryService.getTimeEntryById(id);
    res.json(timeEntry);
  } catch (error) {
    console.error('Error fetching time entry:', error);
    if (error instanceof Error && error.message === 'Time entry not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const updateTimeEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { hours, isRdActivity, rdDescription } = req.body;

    const updateData: any = {};
    if (hours !== undefined) updateData.hours = parseFloat(hours);
    if (isRdActivity !== undefined) updateData.isRdActivity = Boolean(isRdActivity);
    if (rdDescription !== undefined) updateData.rdDescription = rdDescription;

    const timeEntry = await timeEntryService.updateTimeEntry(id, updateData);
    res.json(timeEntry);
  } catch (error) {
    console.error('Error updating time entry:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const deleteTimeEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await timeEntryService.deleteTimeEntry(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting time entry:', error);
    if (error instanceof Error && error.message === 'Time entry not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getRdSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ 
        message: 'Start date and end date are required' 
      });
      return;
    }

    const summary = await timeEntryService.getRdSummary(
      new Date(startDate as string),
      new Date(endDate as string),
      employeeId as string
    );

    res.json(summary);
  } catch (error) {
    console.error('Error fetching R&D summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkMarkAsRd = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { timeEntryIds, rdDescription } = req.body;

    if (!timeEntryIds || !Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      res.status(400).json({ 
        message: 'timeEntryIds array is required' 
      });
      return;
    }

    if (!rdDescription || !rdDescription.trim()) {
      res.status(400).json({ 
        message: 'R&D description is required for HMRC compliance' 
      });
      return;
    }

    const result = await timeEntryService.bulkMarkAsRd(timeEntryIds, rdDescription);
    res.json({ 
      message: `${result.count} time entries marked as R&D`,
      updated: result.count 
    });
  } catch (error) {
    console.error('Error bulk marking as R&D:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getEmployeeTimesheet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ 
        message: 'Start date and end date are required' 
      });
      return;
    }

    const timesheet = await timeEntryService.getEmployeeTimesheet(
      employeeId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(timesheet);
  } catch (error) {
    console.error('Error fetching employee timesheet:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};