//
//  ChatScreen.swift
//  BaatCheet
//
//  Light mode ChatGPT-style chat interface with drawer
//

import SwiftUI

struct ChatScreen: View {
    @StateObject private var viewModel = ChatViewModel()
    @State private var messageText = ""
    @State private var showDrawer = false
    @FocusState private var isInputFocused: Bool
    
    // Light mode colors - Pure white
    private let whiteBackground = Color.white
    private let inputBorder = Color(hex: "E5E5EA")
    private let greenAccent = Color(hex: "34C759")
    private let darkText = Color(hex: "1C1C1E")
    private let grayText = Color(hex: "8E8E93")
    private let chipBackground = Color(hex: "F2F2F7")
    
    var body: some View {
        ZStack {
            // Pure White Background
            whiteBackground
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                chatHeader
                
                // Chat Content
                if viewModel.messages.isEmpty {
                    emptyStateView
                } else {
                    messagesList
                }
                
                // Input Bar
                inputBar
            }
            
            // Drawer overlay
            if showDrawer {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation { showDrawer = false }
                    }
                
                HStack {
                    ChatDrawerView(
                        onNewChat: {
                            viewModel.startNewChat()
                            withAnimation { showDrawer = false }
                        },
                        onClose: {
                            withAnimation { showDrawer = false }
                        }
                    )
                    .frame(width: 300)
                    .transition(.move(edge: .leading))
                    
                    Spacer()
                }
            }
        }
        .animation(.easeInOut(duration: 0.25), value: showDrawer)
    }
    
    // MARK: - Header
    private var chatHeader: some View {
        HStack {
            // Menu Button
            Button(action: { withAnimation { showDrawer = true } }) {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(greenAccent)
            }
            .frame(width: 40, height: 40)
            
            Spacer()
            
            // Title - BLACK text
            Text("BaatCheet 1.0")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(darkText)
            
            Spacer()
            
            // New Chat Button
            Button(action: { viewModel.startNewChat() }) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(greenAccent)
            }
            .frame(width: 40, height: 40)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(whiteBackground)
        .shadow(color: Color.black.opacity(0.05), radius: 1, x: 0, y: 1)
    }
    
    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // App Logo
            Image("SplashLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 48, height: 48)
            
            Spacer()
            
            // Single suggestion chip
            suggestionChip
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 16)
    }
    
    // MARK: - Suggestion Chip
    private var suggestionChip: some View {
        Button(action: { sendSuggestion("Design a database schema for an online merch store") }) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Design a database schema")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(darkText)
                
                Text("for an online merch store")
                    .font(.system(size: 14))
                    .foregroundColor(grayText)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: 280, alignment: .leading)
            .background(chipBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(inputBorder, lineWidth: 1)
            )
        }
    }
    
    // MARK: - Messages List
    private var messagesList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(viewModel.messages) { message in
                        MessageBubbleView(message: message)
                            .id(message.id)
                    }
                }
                .padding(.vertical, 16)
            }
            .onChange(of: viewModel.messages.count) { _ in
                if let lastMessage = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }
    
    // MARK: - Input Bar
    private var inputBar: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: 6) {
                // Left icons
                HStack(spacing: 2) {
                    Button(action: {}) {
                        Image(systemName: "camera")
                            .font(.system(size: 18))
                            .foregroundColor(greenAccent)
                            .frame(width: 28, height: 28)
                    }
                    Button(action: {}) {
                        Image(systemName: "photo")
                            .font(.system(size: 18))
                            .foregroundColor(greenAccent)
                            .frame(width: 28, height: 28)
                    }
                    Button(action: {}) {
                        Image(systemName: "folder")
                            .font(.system(size: 18))
                            .foregroundColor(greenAccent)
                            .frame(width: 28, height: 28)
                    }
                }
                
                // Text Input - smaller
                HStack {
                    TextField("Message", text: $messageText)
                        .font(.system(size: 14))
                        .foregroundColor(darkText)
                        .focused($isInputFocused)
                }
                .frame(height: 36)
                .padding(.horizontal, 12)
                .background(whiteBackground)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(inputBorder, lineWidth: 1)
                )
                
                // Mic button
                Button(action: {}) {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 18))
                        .foregroundColor(greenAccent)
                        .frame(width: 28, height: 28)
                }
                
                // Send / Headphones Button
                Button(action: sendMessage) {
                    if messageText.isEmpty {
                        Image(systemName: "headphones")
                            .font(.system(size: 20))
                            .foregroundColor(greenAccent)
                            .frame(width: 32, height: 32)
                    } else {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(greenAccent)
                            .clipShape(Circle())
                    }
                }
                .disabled(messageText.isEmpty || viewModel.isLoading)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(whiteBackground)
            .shadow(color: Color.black.opacity(0.08), radius: 4, x: 0, y: -2)
        }
    }
    
    // MARK: - Actions
    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        let text = messageText
        messageText = ""
        isInputFocused = false
        
        viewModel.sendMessage(text)
    }
    
    private func sendSuggestion(_ text: String) {
        viewModel.sendMessage(text)
    }
}

// MARK: - Chat Drawer View
struct ChatDrawerView: View {
    let onNewChat: () -> Void
    let onClose: () -> Void
    
    @State private var searchText = ""
    
    private let darkText = Color(hex: "1C1C1E")
    private let grayText = Color(hex: "8E8E93")
    private let greenAccent = Color(hex: "34C759")
    private let inputBorder = Color(hex: "E5E5EA")
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(grayText)
                TextField("Search", text: $searchText)
                    .font(.system(size: 16))
                
                Button(action: onNewChat) {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 18))
                        .foregroundColor(greenAccent)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(inputBorder, lineWidth: 1)
            )
            .padding(.horizontal, 16)
            .padding(.top, 16)
            
            // Menu items
            VStack(alignment: .leading, spacing: 0) {
                DrawerMenuItemView(icon: "square.and.pencil", text: "New chat", action: onNewChat)
                DrawerMenuItemView(icon: "photo", text: "Images", action: {})
                DrawerMenuItemView(icon: "square.grid.2x2", text: "Apps", action: {})
                
                Divider().padding(.vertical, 8)
                
                DrawerMenuItemView(icon: "plus.rectangle", text: "New project", action: {})
                DrawerMenuItemView(icon: "folder", text: "Android", action: {})
                DrawerMenuItemView(icon: "folder", text: "Flowwiseai", action: {})
                DrawerMenuItemView(icon: "ellipsis", text: "All projects", action: {})
                
                Divider().padding(.vertical, 8)
                
                // Recent chats header
                Text("Recent Chats")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(grayText)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                
                // Chat history items
                ChatHistoryItemView(text: "Free AI Image Tools")
                ChatHistoryItemView(text: "Google Checks Overview")
                ChatHistoryItemView(text: "Merge vs Rebase")
                ChatHistoryItemView(text: "AI Portfolio App Ideas")
                ChatHistoryItemView(text: "AI Engineer Career Path")
                ChatHistoryItemView(text: "User greeting assistant")
            }
            .padding(.top, 16)
            
            Spacer()
            
            // Account section
            Divider()
            HStack {
                Circle()
                    .fill(Color(hex: "7C4DFF"))
                    .frame(width: 36, height: 36)
                    .overlay(
                        Text("MS")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                    )
                
                Text("Muhammad Sharjeel")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(darkText)
                
                Image(systemName: "chevron.down")
                    .font(.system(size: 12))
                    .foregroundColor(grayText)
            }
            .padding(16)
        }
        .frame(maxHeight: .infinity)
        .background(Color.white)
    }
}

struct DrawerMenuItemView: View {
    let icon: String
    let text: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(Color(hex: "1C1C1E"))
                    .frame(width: 22)
                
                Text(text)
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "1C1C1E"))
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }
}

struct ChatHistoryItemView: View {
    let text: String
    
    var body: some View {
        Button(action: {}) {
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "1C1C1E"))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
        }
    }
}

// MARK: - Message Bubble View
struct MessageBubbleView: View {
    let message: ChatMessage
    
    private let darkText = Color(hex: "1C1C1E")
    private let grayText = Color(hex: "8E8E93")
    
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            if message.role == .assistant {
                Image("SplashLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 32, height: 32)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.system(size: 15))
                    .foregroundColor(darkText)
                    .textSelection(.enabled)
                    .lineSpacing(4)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        message.role == .user ?
                        Color(hex: "F2F2F7") : Color.white
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(
                        color: message.role == .assistant ? Color.black.opacity(0.05) : Color.clear,
                        radius: 2, x: 0, y: 1
                    )
                
                if message.isStreaming {
                    HStack(spacing: 4) {
                        ForEach(0..<3, id: \.self) { _ in
                            Circle()
                                .fill(grayText)
                                .frame(width: 6, height: 6)
                        }
                    }
                    .padding(.top, 4)
                }
            }
            .frame(maxWidth: 260, alignment: message.role == .user ? .trailing : .leading)
            
            if message.role == .user {
                Spacer(minLength: 8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)
    }
}

// MARK: - Preview
#Preview {
    ChatScreen()
}
