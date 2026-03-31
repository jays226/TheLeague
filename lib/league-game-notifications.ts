import "server-only";

import {
  createGameNotificationEvent,
  getGameNotificationEvent,
  getTeamById,
  listLeagueGames,
  saveLeagueGameResult
} from "@/lib/db";
import {
  formatEasternDateKey,
  getEasternParts,
  isAfterEasternMidnightForMatch,
  isAtOrAfterEasternHour
} from "@/lib/eastern-time";
import { sendMatchReminderEmail, sendScoreReminderEmail } from "@/lib/email-notifications";

export async function processLeagueGameNotifications(now = new Date()) {
  const games = await listLeagueGames();
  const todayEastern = formatEasternDateKey(now);
  const summary = {
    checkedGames: games.length,
    matchRemindersSent: 0,
    remindersSent: 0,
    finalizedResults: 0
  };

  for (const game of games) {
    const existingResult = Boolean(game.winnerTeamId);
    const homeSubmission = game.submissions.find(
      (submission) => submission.submitting_team_id === game.homeTeamId
    );
    const awaySubmission = game.submissions.find(
      (submission) => submission.submitting_team_id === game.awayTeamId
    );

    if (game.matchDate === todayEastern && isAtOrAfterEasternHour(now, 14)) {
      const matchReminderAlreadySent = await getGameNotificationEvent({
        notificationType: "match_reminder",
        slotId: game.slotId,
        week: game.week,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId
      });

      if (!matchReminderAlreadySent) {
        const [homeTeam, awayTeam] = await Promise.all([
          getTeamById(game.homeTeamId),
          getTeamById(game.awayTeamId)
        ]);

        if (homeTeam) {
          await sendMatchReminderEmail({
            team: homeTeam,
            opponentTeamName: game.awayTeamName,
            timeLabel: game.timeLabel,
            locationLabel: game.locationLabel,
            dateLabel: game.dateLabel
          });
          summary.matchRemindersSent += 1;
        }

        if (awayTeam) {
          await sendMatchReminderEmail({
            team: awayTeam,
            opponentTeamName: game.homeTeamName,
            timeLabel: game.timeLabel,
            locationLabel: game.locationLabel,
            dateLabel: game.dateLabel
          });
          summary.matchRemindersSent += 1;
        }

        await createGameNotificationEvent({
          notificationType: "match_reminder",
          slotId: game.slotId,
          week: game.week,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId
        });
      }
    }

    if (!existingResult && game.matchDate === todayEastern && isAtOrAfterEasternHour(now, 21)) {
      const reminderAlreadySent = await getGameNotificationEvent({
        notificationType: "score_reminder",
        slotId: game.slotId,
        week: game.week,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId
      });

      if (!reminderAlreadySent && (!homeSubmission || !awaySubmission)) {
        const [homeTeam, awayTeam] = await Promise.all([
          getTeamById(game.homeTeamId),
          getTeamById(game.awayTeamId)
        ]);

        if (!homeSubmission && homeTeam) {
          await sendScoreReminderEmail({
            team: homeTeam,
            opponentTeamName: game.awayTeamName,
            dateLabel: game.dateLabel
          });
          summary.remindersSent += 1;
        }

        if (!awaySubmission && awayTeam) {
          await sendScoreReminderEmail({
            team: awayTeam,
            opponentTeamName: game.homeTeamName,
            dateLabel: game.dateLabel
          });
          summary.remindersSent += 1;
        }

        await createGameNotificationEvent({
          notificationType: "score_reminder",
          slotId: game.slotId,
          week: game.week,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId
        });
      }
    }

    if (
      !existingResult &&
      isAfterEasternMidnightForMatch(now, game.matchDate) &&
      game.submissions.length === 1
    ) {
      const finalizeAlreadyRecorded = await getGameNotificationEvent({
        notificationType: "single_submission_finalized",
        slotId: game.slotId,
        week: game.week,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId
      });

      if (!finalizeAlreadyRecorded) {
        const loneSubmission = game.submissions[0];
        await saveLeagueGameResult({
          slotId: game.slotId,
          week: game.week,
          matchDate: game.matchDate,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          winnerTeamId: loneSubmission.winner_team_id,
          homeTeamWins: loneSubmission.home_team_wins,
          awayTeamWins: loneSubmission.away_team_wins
        });
        await createGameNotificationEvent({
          notificationType: "single_submission_finalized",
          slotId: game.slotId,
          week: game.week,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId
        });
        summary.finalizedResults += 1;
      }
    }
  }

  return {
    ...summary,
    processedAtEastern: getEasternParts(now)
  };
}
