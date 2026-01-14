import SwiftUI
import Combine

enum NavigationDestination: Hashable {
    // Login Cases
    case forgotPassword

}

struct RootCoordinator: View {
    enum Root {
        case splash
        case authorisation
        case mainApp
    }
    
    @State private var root: Root = .splash
    @ObservedObject private var rootViewModel = RootViewModel()
    @ObservedObject private var authenticationManager = AuthenticationManager.shared
    @StateObject private var navigationManager = NavigationManager()
    private var cancellables = Set<AnyCancellable>()
    
    
    // MARK: - Views
    var body: some View {
        
            ZStack {
                switch root {
                case .splash:
                    SplashScreen()
                        .onAppear {
                            appStart()
                        }
                    
                case .authorisation:
                    NavigationStack(path: $navigationManager.rootPath) {
                        LoginScreen().environmentObject(navigationManager)
                        }
                    
                case .mainApp:
                    ChatScreen()
                }
            }
            .onChange(of: rootViewModel.isAppStartCompleted) { _ in
                print("📬 isAppstartedCompleted received for app start complete")

                updateRoot()
            }
            .onChange(of: authenticationManager.isAuthenticated) { _ in updateRoot() }
        
            .onReceive(NotificationCenter.default.publisher(for: .appStartCompleted)) { _ in
                print("📬 Notification received for app start complete")
                updateRoot()
            }
    }
    
    
    // MARK: - Functions
    private func appStart() {
        Task { @MainActor in
            do {
                try await rootViewModel.start()
            } catch {
                ErrorHandler.logError(message: "Error while starting app", error: error)
            }
        }
    }
    
    private func updateRoot() {
        let userStatus = UserPreferences.shared.getUserLoginStatus()
        
        switch userStatus{
        case .LoggedIn:
            root = .mainApp
        case .LoggedOut:
            root = .authorisation
        case .none:
            root = .authorisation
        }
    }
}

#Preview {
    RootCoordinator()
}
