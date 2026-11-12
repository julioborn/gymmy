//
//  SportTimeWidgetLiveActivity.swift
//  SportTimeWidget
//
//  Created by Julio Born on 11/11/2026.
//

import ActivityKit
import WidgetKit
import SwiftUI

private let bg = Color(red: 0.067, green: 0.067, blue: 0.067) // #111111, igual que el resto de la app
private let lime = Color(red: 0.639, green: 0.902, blue: 0.208)   // #a3e635 — work
private let orange = Color(red: 0.976, green: 0.451, blue: 0.086) // #f97316 — rest
private let neutral = Color(white: 0.8)                           // prep/done

private func phaseColor(_ phase: String) -> Color {
    switch phase {
    case "work": return lime
    case "rest": return orange
    default: return neutral
    }
}

struct SportTimeWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SportTimeWidgetAttributes.self) { context in
            let state = context.state
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(state.phaseLabel)
                        .font(.headline)
                        .foregroundStyle(phaseColor(state.phase))
                    if state.totalRounds > 0 {
                        Text("Ronda \(state.round)/\(state.totalRounds)")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
                Spacer()
                if state.phase == "done" {
                    Text("🏆")
                        .font(.system(size: 34))
                } else {
                    Text(timerInterval: Date()...state.phaseEndsAt, countsDown: true)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .frame(width: 110)
                }
            }
            .padding(16)
            .activityBackgroundTint(bg)
            .activitySystemActionForegroundColor(.white)

        } dynamicIsland: { context in
            let state = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(state.phaseLabel)
                        .font(.headline)
                        .foregroundStyle(phaseColor(state.phase))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if state.totalRounds > 0 {
                        Text("\(state.round)/\(state.totalRounds)")
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if state.phase == "done" {
                        Text("¡Listo! 🏆").font(.title3.bold())
                    } else {
                        Text(timerInterval: Date()...state.phaseEndsAt, countsDown: true)
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                }
            } compactLeading: {
                Circle().fill(phaseColor(state.phase)).frame(width: 10, height: 10)
            } compactTrailing: {
                if state.phase == "done" {
                    Text("🏆")
                } else {
                    Text(timerInterval: Date()...state.phaseEndsAt, countsDown: true)
                        .font(.caption2)
                        .monospacedDigit()
                        .frame(width: 42)
                }
            } minimal: {
                Circle().fill(phaseColor(state.phase)).frame(width: 8, height: 8)
            }
            .keylineTint(phaseColor(state.phase))
        }
    }
}
