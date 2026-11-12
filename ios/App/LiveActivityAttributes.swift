//
//  LiveActivityAttributes.swift
//  Compartido entre el target App y la extension SportTimeWidget.
//  Define los datos de la Live Activity del timer.
//

import ActivityKit
import Foundation

public struct SportTimeWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var phase: String       // "prep" | "work" | "rest" | "done"
        public var phaseLabel: String  // "Preparate" | "Trabajo" | "Descanso" | "¡Listo!"
        public var round: Int
        public var totalRounds: Int
        public var phaseEndsAt: Date
        public var progress: Double // 0...1, del entrenamiento completo

        public init(phase: String, phaseLabel: String, round: Int, totalRounds: Int, phaseEndsAt: Date, progress: Double) {
            self.phase = phase
            self.phaseLabel = phaseLabel
            self.round = round
            self.totalRounds = totalRounds
            self.phaseEndsAt = phaseEndsAt
            self.progress = progress
        }
    }

    public var startedAt: Date

    public init(startedAt: Date) {
        self.startedAt = startedAt
    }
}
