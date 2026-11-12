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
private let emerald = Color(red: 0.063, green: 0.725, blue: 0.506) // #10b981 — listo, mismo verde que el trofeo de la app
private let neutral = Color(white: 0.8)                           // prep

private func phaseColor(_ phase: String) -> Color {
    switch phase {
    case "work": return lime
    case "rest": return orange
    case "done": return emerald
    default: return neutral
    }
}

// Icono para la pill compacta de la Dynamic Island, donde no entra
// "Trabajo"/"Descanso" completo como texto: play = trabajo, pausa = descanso.
private func phaseIcon(_ phase: String) -> String {
    switch phase {
    case "work": return "play.fill"
    case "rest": return "pause.fill"
    case "prep": return "hourglass"
    default: return "flag.checkered"
    }
}

struct SportTimeWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SportTimeWidgetAttributes.self) { context in
            let state = context.state
            VStack(alignment: .leading, spacing: 10) {
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
                            .scaleEffect(1.15)
                            .animation(.spring(response: 0.35, dampingFraction: 0.45), value: state.phase)
                    } else {
                        Text(timerInterval: Date()...state.phaseEndsAt, countsDown: true)
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .frame(width: 110)
                    }
                }
                ProgressView(value: state.progress)
                    .tint(phaseColor(state.phase))
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
                        .padding(.leading, 8)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if state.totalRounds > 0 {
                        Text("\(state.round)/\(state.totalRounds)")
                            .foregroundStyle(.white.opacity(0.7))
                            .padding(.trailing, 8)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        if state.phase == "done" {
                            Text("¡Listo! 🏆")
                                .font(.title3.bold())
                                .foregroundStyle(emerald)
                                .scaleEffect(1.1)
                                .animation(.spring(response: 0.35, dampingFraction: 0.45), value: state.phase)
                        } else {
                            Text(timerInterval: Date()...state.phaseEndsAt, countsDown: true)
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .monospacedDigit()
                        }
                        ProgressView(value: state.progress)
                            .tint(phaseColor(state.phase))
                    }
                    .padding(.horizontal, 10)
                    .padding(.bottom, 4)
                }
            } compactLeading: {
                if state.phase == "done" {
                    Text("🏆")
                        .scaleEffect(1.15)
                        .animation(.spring(response: 0.35, dampingFraction: 0.45), value: state.phase)
                } else {
                    HStack(spacing: 3) {
                        Image(systemName: phaseIcon(state.phase))
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(phaseColor(state.phase))
                        if state.totalRounds > 0 {
                            Text("\(state.round)/\(state.totalRounds)")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.75))
                        }
                    }
                }
            } compactTrailing: {
                if state.phase == "done" {
                    Text("🏆")
                } else {
                    Text(timerInterval: Date()...state.phaseEndsAt, countsDown: true)
                        .font(.caption2)
                        .monospacedDigit()
                        .foregroundStyle(phaseColor(state.phase))
                        .frame(width: 42)
                }
            } minimal: {
                Circle().fill(phaseColor(state.phase)).frame(width: 8, height: 8)
            }
            .keylineTint(phaseColor(state.phase))
        }
    }
}
