//
//  NavigationManager.swift
//  BaseProjectApp
//
//  Created by Meesum Raza on 19/02/2025.
//
import SwiftUI

enum RootPath {
    case root
    case trainingTab
    case accountTab
}

/// Handles navigation at both **root** and **tab** levels.
class NavigationManager: ObservableObject {
    static let shared = NavigationManager()
    @Published var rootPath = NavigationPath()
    @Published var tabPath1 = NavigationPath()
    @Published var tabPath2 = NavigationPath()

    @Published var tabPath3 = NavigationPath()

    
    func navigate(to destination: NavigationDestination, rootPath: RootPath = .root) {
        switch rootPath {
        case .root:
                self.rootPath.append(destination)
        case .trainingTab:
                self.tabPath1.append(destination)
        case .accountTab:
            self.tabPath3.append(destination)
            }
    }

    func goBack() {
        DispatchQueue.main.async {
            if !self.tabPath1.isEmpty {
                self.tabPath1.removeLast()
            } else if !self.rootPath.isEmpty {
                self.rootPath.removeLast()
            } else if !self.tabPath3.isEmpty {
                self.tabPath3.removeLast()
            }
        }
    }

    func goToRoot() {
        DispatchQueue.main.async {
            self.rootPath = NavigationPath()
            self.tabPath1 = NavigationPath()
        }
    }
}

