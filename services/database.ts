
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';
import { User, Schedule, History, SystemConfig, AttendanceStatus } from '../types';

const client = generateClient<Schema>();

export const db = {
  getUsers: async (): Promise<User[]> => {
    // Added empty object to list() to satisfy type requirements for 1-2 arguments
    const { data: users } = await client.models.User.list({});
    return users
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(u => ({ id: u.id, name: u.name }));
  },
  
  saveUsers: async (users: User[]) => {
    await Promise.all(users.map((u, index) => 
      client.models.User.update({ id: u.id, name: u.name, order: index })
    ));
  },

  saveUser: async (user: User) => {
    const users = await db.getUsers();
    if (user.id && users.some(u => u.id === user.id)) {
      await client.models.User.update({ id: user.id, name: user.name });
    } else {
      await client.models.User.create({ name: user.name, order: users.length });
    }
  },

  deleteUser: async (id: string) => {
    await client.models.User.delete({ id });
    const { data: userSchedules } = await client.models.Schedule.list({
      filter: { userId: { eq: id } }
    });
    await Promise.all(userSchedules.map(s => client.models.Schedule.delete({ userId: s.userId, date: s.date })));
  },

  getSchedules: async (): Promise<Schedule[]> => {
    // Added empty object to list() to satisfy type requirements for 1-2 arguments
    const { data: schedules } = await client.models.Schedule.list({});
    return schedules.map(s => ({ userId: s.userId, date: s.date, status: s.status as AttendanceStatus }));
  },
  
  getSchedulesForUser: async (userId: string): Promise<Schedule[]> => {
    const { data: schedules } = await client.models.Schedule.list({
      filter: { userId: { eq: userId } }
    });
    return schedules.map(s => ({ userId: s.userId, date: s.date, status: s.status as AttendanceStatus }));
  },

  updateSchedules: async (updates: Schedule[]) => {
    for (const update of updates) {
      try {
        const { data: existing } = await client.models.Schedule.get({ userId: update.userId, date: update.date });
        if (existing) {
          await client.models.Schedule.update({
            userId: update.userId,
            date: update.date,
            status: update.status
          });
        } else {
          await client.models.Schedule.create({
            userId: update.userId,
            date: update.date,
            status: update.status
          });
        }
      } catch (e) {
        console.error("Schedule update error:", e);
      }
    }
  },

  getHistories: async (): Promise<History[]> => {
    // Added empty object to list() to satisfy type requirements for 1-2 arguments
    const { data: histories } = await client.models.History.list({});
    return histories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(h => ({
        id: h.id,
        userId: h.userId,
        userName: h.userName,
        message: h.message,
        isProcessed: h.isProcessed,
        createdAt: h.createdAt
      }));
  },
  
  addHistory: async (history: Omit<History, 'id' | 'createdAt'>) => {
    await client.models.History.create({
      userId: history.userId,
      userName: history.userName,
      message: history.message,
      isProcessed: history.isProcessed
    });
  },

  updateHistoryStatus: async (id: string, isProcessed: boolean) => {
    await client.models.History.update({ id, isProcessed });
  },

  getConfig: async (): Promise<SystemConfig> => {
    // Avoid direct destructuring to help with potential type inference conflicts
    const response = await client.models.Config.get({ id: 'system' });
    const config = response.data;
    
    if (!config) {
      const defaultConfig: SystemConfig = {
        id: 'system',
        seasonStartDate: '2026-01-01',
        seasonEndDate: '2026-03-31'
      };
      await client.models.Config.create(defaultConfig);
      return defaultConfig;
    }

    // Cast config to bypass incorrect any[] inference as reported by the compiler errors
    const c = config as any;
    return {
      id: c.id as 'system',
      seasonStartDate: c.seasonStartDate,
      seasonEndDate: c.seasonEndDate
    };
  },
  
  saveConfig: async (config: SystemConfig) => {
    await client.models.Config.update({
      id: 'system',
      seasonStartDate: config.seasonStartDate,
      seasonEndDate: config.seasonEndDate
    });
  }
};
