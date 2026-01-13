//
//  RefreshableScrollView.swift
//  BaseProjectApp
//
//  Created by Nudrat Jabbar on 17/02/2025.
//

import SwiftUI
//  BuiltInRefreshable.swift
import SwiftUI

struct BuiltInRefreshable: View {
    func refreshData() async {
        // do work to asyncronously refresh your data here
        try? await Task.sleep(nanoseconds: 3_000_000_000)
    }
    
    var body: some View {
        List(0...100, id: \.self) { index in
            Text("row \(index)")
        }
        .refreshable {
            await refreshData()
        }
    }
}

struct ViewOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value += nextValue()
    }
}

#Preview {
    BuiltInRefreshable()
}
