import ShelterLog from "@/models/ShelterLog";
import mongoose from "mongoose";

/**
 * [Server-side Only] คำนวณ currentOccupancy จาก ShelterLog
 */
export const calculateCurrentOccupancy = async (shelterId: string | mongoose.Types.ObjectId): Promise<number> => {
  try {
    const result = await ShelterLog.aggregate([
      { $match: { shelterId: new mongoose.Types.ObjectId(shelterId.toString()) } },
      {
        $group: {
          _id: null,
          totalIn: {
            $sum: { $cond: [{ $eq: ["$action", "in"] }, "$amount", 0] }
          },
          totalOut: {
            $sum: { $cond: [{ $eq: ["$action", "out"] }, "$amount", 0] }
          }
        }
      }
    ]);

    const totalIn = result[0]?.totalIn || 0;
    const totalOut = result[0]?.totalOut || 0;
    return Math.max(0, totalIn - totalOut);
  } catch (error) {
    console.error('Error calculating occupancy:', error);
    return 0;
  }
};

/**
 * [Server-side Only] คำนวณยอดสะสมการเข้า-ออกตามช่วงเวลา
 */
export const getAggregatedMovement = async (
  shelterId: string | mongoose.Types.ObjectId, 
  timeRangeDays: number
): Promise<{ in: number; out: number }> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRangeDays);
    startDate.setHours(0, 0, 0, 0);

    const logs = await ShelterLog.find({
      shelterId: new mongoose.Types.ObjectId(shelterId.toString()),
      date: { $gte: startDate }
    });

    return logs.reduce((acc, log) => {
      if (log.action === 'in') acc.in += log.amount;
      else if (log.action === 'out') acc.out += log.amount;
      return acc;
    }, { in: 0, out: 0 });
  } catch (error) {
    console.error('Error getting aggregated movement:', error);
    return { in: 0, out: 0 };
  }
};

/**
 * [Server-side Only] คำนวณข้อมูลสถิติรายวัน
 */
export const getDailyStats = async (
  shelterId: string | mongoose.Types.ObjectId,
  days: number = 7
): Promise<Array<{ date: string; checkIn: number; checkOut: number }>> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await ShelterLog.find({
      shelterId: new mongoose.Types.ObjectId(shelterId.toString()),
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const dailyMap = new Map<string, { checkIn: number; checkOut: number }>();
    logs.forEach(log => {
      const dateStr = log.date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr) || { checkIn: 0, checkOut: 0 };
      if (log.action === 'in') existing.checkIn += log.amount;
      else if (log.action === 'out') existing.checkOut += log.amount;
      dailyMap.set(dateStr, existing);
    });

    return Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      ...stats
    }));
  } catch (error) {
    console.error('Error getting daily stats:', error);
    return [];
  }
};
