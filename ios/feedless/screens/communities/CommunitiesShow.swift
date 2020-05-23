//
//  CommunitiesShow.swift
//  feedless
//
//  Created by Rogerio Chaves on 23/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct CommunitiesShow : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var communities : Communities
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var selection = 0
    private var name : String

    init(name : String) {
        self.name = name
    }

    func communitiesList() -> some View {
        if let community = communities.communities[self.name] {
            switch community {
            case .loading:
                return AnyView(Text("Loading..."))
            case let .success(community):
                return AnyView(
                    Form {
                        ForEach(community.topics, id: \.key) { topic in
                            NavigationLink(destination: CommunitiesTopic(name: community.name, topicKey: topic.key)) {
                                HStack {
                                    Text(Utils.topicTitle(topic))
                                    Spacer()
                                    Text("💬 \(topic.value.content.replies.count) replies")
                                }
                            }
                        }
                    }
                    .navigationBarTitle("#\(community.name)")
                )
            case let .error(message):
                return AnyView(Text(message))
            }
        } else {
            return AnyView(Text("Loading..."))
        }
    }

    var body: some View {
        communitiesList()
            .onAppear() {
                self.communities.load(context: self.context, name: self.name)
            }
    }
}

struct CommunitiesShow_Previews: PreviewProvider {
    static var previews: some View {
        NavigationMenu {
            CommunitiesShow(name: "ssb-clients")
        }
            .environmentObject(Samples.context())
            .environmentObject(Samples.communities())
            .environmentObject(ImageLoader())
    }
}
