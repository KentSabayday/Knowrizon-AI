# KnowRizon AI — User Flowchart

> [!NOTE]
> Complete user journey flowchart matching the reference style with colored nodes.
> Paste each flowchart into [mermaid.ai](https://mermaid.ai) one at a time.

---

## 🔄 Flowchart 1 — Main User Journey (Full Overview)

```mermaid
flowchart TD
    START([🚀 User Opens KnowRizon])
    START --> LANDING[Landing Page]
    LANDING --> IS_MEMBER{Already a member?}

    IS_MEMBER -->|Yes| LOGIN_FORM[Enter Email and Password]
    IS_MEMBER -->|No| WANT_REG{Want to register?}

    WANT_REG -->|Yes| REG_FORM[Fill Registration Form\nName, Email, Password]
    WANT_REG -->|No| ANON{Continue as Anonymous?}

    ANON -->|Yes| ANON_SESSION[Create Anonymous Session]
    ANON -->|No| EXIT_APP([Exit Application])

    ANON_SESSION --> AUTH_SUCCESS

    REG_FORM --> REG_VALID{Valid registration\ndata?}
    REG_VALID -->|No| REG_ERROR[Show Validation Error]
    REG_ERROR --> REG_FORM
    REG_VALID -->|Yes| CREATE_ACCT[Create User Account\nin Supabase]
    CREATE_ACCT --> AUTH_SUCCESS

    LOGIN_FORM --> CRED_CHECK{Valid credentials?}
    CRED_CHECK -->|Yes| AUTH_SUCCESS[Generate Session Token]
    CRED_CHECK -->|No| LOGIN_FAIL[Login Failed\nShow Error]
    LOGIN_FAIL --> RETRY{Retry login?}
    RETRY -->|Yes| LOGIN_FORM
    RETRY -->|No| EXIT_APP

    AUTH_SUCCESS --> CONNECT_PUSHER[Connect to Pusher\nReal-time Channel]
    CONNECT_PUSHER --> DASHBOARD[📊 Dashboard\nMain Hub]

    DASHBOARD --> NAV{Select Feature}

    NAV -->|Lessons| LESSONS[📚 AI Chat / Lessons]
    NAV -->|Practice| PRACTICE[🏋️ Practice Quizzes]
    NAV -->|Friends| FRIENDS[👥 Friends]
    NAV -->|Groups| GROUPS[👨‍👩‍👧‍👦 Study Groups]
    NAV -->|Progress| PROGRESS[📈 Progress Tracking]
    NAV -->|History| HISTORY[📜 Chat History]
    NAV -->|Settings| SETTINGS[⚙️ Settings]

    LESSONS --> DASHBOARD
    PRACTICE --> DASHBOARD
    FRIENDS --> DASHBOARD
    GROUPS --> DASHBOARD
    PROGRESS --> DASHBOARD
    HISTORY --> DASHBOARD
    SETTINGS --> LOGOUT{Logout?}
    LOGOUT -->|No| DASHBOARD
    LOGOUT -->|Yes| DESTROY_SESSION[Destroy Session Token\nDisconnect Pusher]
    DESTROY_SESSION --> LANDING

    style START fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style EXIT_APP fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style IS_MEMBER fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style WANT_REG fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style ANON fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style REG_VALID fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style CRED_CHECK fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style RETRY fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style NAV fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style LOGOUT fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style LANDING fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style LOGIN_FORM fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style REG_FORM fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style ANON_SESSION fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style CREATE_ACCT fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style AUTH_SUCCESS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style CONNECT_PUSHER fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style DASHBOARD fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style LESSONS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style PRACTICE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style FRIENDS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style GROUPS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style PROGRESS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style HISTORY fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SETTINGS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style DESTROY_SESSION fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style REG_ERROR fill:#e07a5f,stroke:#c96a50,color:#fff,stroke-width:2px
    style LOGIN_FAIL fill:#e07a5f,stroke:#c96a50,color:#fff,stroke-width:2px
```

---

## 📚 Flowchart 2 — AI Chat / Lessons Flow

```mermaid
flowchart TD
    ENTER([📚 Enter Lessons])
    ENTER --> HAS_CONV{Existing\nconversation?}

    HAS_CONV -->|Yes| SELECT_CONV[Select Conversation\nfrom History]
    HAS_CONV -->|No| NEW_CONV[Start New\nConversation]

    SELECT_CONV --> LOAD_MSGS[Load Previous\nMessages]
    LOAD_MSGS --> CHAT_VIEW
    NEW_CONV --> CHAT_VIEW[Chat Interface]

    CHAT_VIEW --> HAS_CONTENT{Upload content\nfirst?}
    HAS_CONTENT -->|Yes| UPLOAD[Upload PDF / Video / Image]
    HAS_CONTENT -->|No| TYPE_MSG[Type Question\nor Message]

    UPLOAD --> PROCESS{Content\nprocessing}
    PROCESS -->|Success| EXTRACT[AI Extracts Title,\nSummary, Key Points]
    PROCESS -->|Failed| UPLOAD_ERR[Show Processing Error]
    UPLOAD_ERR --> CHAT_VIEW

    EXTRACT --> CONTEXT_READY[Content Context\nAvailable]
    CONTEXT_READY --> TYPE_MSG

    TYPE_MSG --> SEND[Send Message to\nTutorAgent API]
    SEND --> AI_RESP{AI Response\nreceived?}
    AI_RESP -->|Yes| DISPLAY[Display AI Response\nwith Markdown]
    AI_RESP -->|No| AI_ERR[Show Error\nRetry Available]
    AI_ERR --> TYPE_MSG

    DISPLAY --> SAVE_DB[Save to Conversation\nHistory in DB]
    SAVE_DB --> CONTINUE{Continue\nchatting?}
    CONTINUE -->|Yes| TYPE_MSG
    CONTINUE -->|No| BACK([Return to Dashboard])

    style ENTER fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style BACK fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style HAS_CONV fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style HAS_CONTENT fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style PROCESS fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style AI_RESP fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style CONTINUE fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style SELECT_CONV fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style NEW_CONV fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style LOAD_MSGS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style CHAT_VIEW fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style UPLOAD fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style EXTRACT fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style CONTEXT_READY fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style TYPE_MSG fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SEND fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style DISPLAY fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SAVE_DB fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style UPLOAD_ERR fill:#e07a5f,stroke:#c96a50,color:#fff,stroke-width:2px
    style AI_ERR fill:#e07a5f,stroke:#c96a50,color:#fff,stroke-width:2px
```

---

## 🏋️ Flowchart 3 — Practice / Quiz Flow

```mermaid
flowchart TD
    ENTER([🏋️ Enter Practice])
    ENTER --> HAS_MATERIAL{Uploaded content\navailable?}

    HAS_MATERIAL -->|Yes| SELECT_TOPIC[Select Topic from\nUploaded Content]
    HAS_MATERIAL -->|No| ENTER_TOPIC[Enter Custom\nTopic Manually]

    SELECT_TOPIC --> SET_COUNT[Set Number of\nQuestions: 5-20]
    ENTER_TOPIC --> SET_COUNT

    SET_COUNT --> GENERATE[QuizAgent Generates\nQuestions via AI]
    GENERATE --> GEN_CHECK{Quiz generated\nsuccessfully?}

    GEN_CHECK -->|No| FALLBACK[Show Fallback\nPlaceholder Quiz]
    GEN_CHECK -->|Yes| SHOW_QUIZ[Display Quiz\nInterface]
    FALLBACK --> SHOW_QUIZ

    SHOW_QUIZ --> ANSWER[User Selects\nAnswer Option]
    ANSWER --> NEXT{More questions\nremaining?}
    NEXT -->|Yes| SHOW_QUIZ
    NEXT -->|No| SUBMIT[Submit All Answers]

    SUBMIT --> CALCULATE[Calculate Score\nand Percentage]
    CALCULATE --> RESULTS[Display Results\nScore, Explanations]
    RESULTS --> SAVE[Save Quiz Result\nto Database]
    SAVE --> REVIEW{Review\nanswers?}

    REVIEW -->|Yes| EXPLANATIONS[Show Correct Answers\nwith Explanations]
    REVIEW -->|No| AGAIN{Take another\nquiz?}
    EXPLANATIONS --> AGAIN

    AGAIN -->|Yes| HAS_MATERIAL
    AGAIN -->|No| BACK([Return to Dashboard])

    style ENTER fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style BACK fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style HAS_MATERIAL fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style GEN_CHECK fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style NEXT fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style REVIEW fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style AGAIN fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style SELECT_TOPIC fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style ENTER_TOPIC fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SET_COUNT fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style GENERATE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SHOW_QUIZ fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style ANSWER fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SUBMIT fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style CALCULATE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style RESULTS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SAVE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style EXPLANATIONS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style FALLBACK fill:#e07a5f,stroke:#c96a50,color:#fff,stroke-width:2px
```

---

## 👥 Flowchart 4 — Friends & Social Flow

```mermaid
flowchart TD
    ENTER([👥 Enter Friends])
    ENTER --> FRIENDS_VIEW[Friends List View]
    FRIENDS_VIEW --> ACTION{Choose action}

    ACTION -->|Search Users| SEARCH[Search Users\nby Name or Email]
    ACTION -->|View Requests| REQUESTS[View Pending\nFriend Requests]
    ACTION -->|Message Friend| START_DM[Open Direct Chat\nwith Friend]
    ACTION -->|Call Friend| START_CALL[Initiate Voice\nor Video Call]
    ACTION -->|Remove Friend| REMOVE[Remove Friend\nfrom List]

    SEARCH --> FOUND{User found?}
    FOUND -->|Yes| SEND_REQ[Send Friend\nRequest]
    FOUND -->|No| NO_RESULTS[No Users Found]
    NO_RESULTS --> FRIENDS_VIEW
    SEND_REQ --> NOTIFY[Pusher Notifies\nRecipient in Real-time]
    NOTIFY --> FRIENDS_VIEW

    REQUESTS --> REQ_ACTION{Accept or\nDecline?}
    REQ_ACTION -->|Accept| ACCEPT[Accept Request\nCreate Friendship]
    REQ_ACTION -->|Decline| DECLINE[Decline Request]
    ACCEPT --> FRIENDS_VIEW
    DECLINE --> FRIENDS_VIEW

    START_DM --> DM_VIEW[Direct Message\nChat Interface]
    DM_VIEW --> SEND_MSG[Type and Send\nMessage]
    SEND_MSG --> PUSH_MSG[Pusher Broadcasts\nto Recipient]
    PUSH_MSG --> DM_VIEW

    START_CALL --> CALL_TYPE{Voice or\nVideo?}
    CALL_TYPE -->|Voice| VOICE[Start Voice Call\nWebRTC Connection]
    CALL_TYPE -->|Video| VIDEO[Start Video Call\nWebRTC Connection]
    VOICE --> IN_CALL[In Call\nMute, End Controls]
    VIDEO --> IN_CALL
    IN_CALL --> END_CALL[End Call\nSave Duration]
    END_CALL --> FRIENDS_VIEW

    REMOVE --> CONFIRM{Confirm\nremoval?}
    CONFIRM -->|Yes| DELETE_FRIEND[Delete Friendship\nfrom Database]
    CONFIRM -->|No| FRIENDS_VIEW
    DELETE_FRIEND --> FRIENDS_VIEW

    style ENTER fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style ACTION fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style FOUND fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style REQ_ACTION fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style CALL_TYPE fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style CONFIRM fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style FRIENDS_VIEW fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SEARCH fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style REQUESTS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SEND_REQ fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style NOTIFY fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style ACCEPT fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style DECLINE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style START_DM fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style DM_VIEW fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SEND_MSG fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style PUSH_MSG fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style START_CALL fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style VOICE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style VIDEO fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style IN_CALL fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style END_CALL fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style DELETE_FRIEND fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style REMOVE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style NO_RESULTS fill:#e07a5f,stroke:#c96a50,color:#fff,stroke-width:2px
```

---

## 👨‍👩‍👧‍👦 Flowchart 5 — Study Groups Flow

```mermaid
flowchart TD
    ENTER([👨‍👩‍👧‍👦 Enter Study Groups])
    ENTER --> GROUPS_VIEW[Groups List View]
    GROUPS_VIEW --> ACTION{Choose action}

    ACTION -->|Create Group| CREATE[Enter Group Name\nand Description]
    ACTION -->|Join Group| PENDING[View Pending\nInvitations]
    ACTION -->|Open Group| OPEN[Open Group\nChat Room]

    CREATE --> SAVE_GROUP[Create Group\nin Database]
    SAVE_GROUP --> AUTO_JOIN[Auto-add Creator\nas Admin Member]
    AUTO_JOIN --> INVITE[Invite Friends\nto Group]
    INVITE --> NOTIFY[Pusher Notifies\nInvited Friends]
    NOTIFY --> GROUPS_VIEW

    PENDING --> INV_ACTION{Accept or\nDecline?}
    INV_ACTION -->|Accept| JOIN[Join Group\nSet Status Active]
    INV_ACTION -->|Decline| DECLINE_INV[Decline Invitation]
    JOIN --> GROUPS_VIEW
    DECLINE_INV --> GROUPS_VIEW

    OPEN --> GROUP_CHAT[Group Chat\nInterface]
    GROUP_CHAT --> GRP_ACTION{Group action}

    GRP_ACTION -->|Send Message| GRP_MSG[Type and Send\nGroup Message]
    GRP_ACTION -->|Start Call| GRP_CALL[Start Group\nVoice or Video Call]
    GRP_ACTION -->|View Members| MEMBERS[View Member List\nwith Roles]
    GRP_ACTION -->|Leave Group| LEAVE{Confirm\nleave?}

    GRP_MSG --> BROADCAST[Pusher Broadcasts\nto All Members]
    BROADCAST --> GROUP_CHAT

    GRP_CALL --> GRP_IN_CALL[Group Call Active\nMultiple Participants]
    GRP_IN_CALL --> GRP_END[End Call]
    GRP_END --> GROUP_CHAT

    MEMBERS --> GROUP_CHAT

    LEAVE -->|Yes| LEAVE_GRP[Leave Group\nSet Status Left]
    LEAVE -->|No| GROUP_CHAT
    LEAVE_GRP --> GROUPS_VIEW

    style ENTER fill:#d4a5b5,stroke:#b8899a,color:#fff,stroke-width:2px
    style ACTION fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style INV_ACTION fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style GRP_ACTION fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style LEAVE fill:#e8c4a0,stroke:#d1a87a,color:#333,stroke-width:2px
    style GROUPS_VIEW fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style CREATE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style SAVE_GROUP fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style AUTO_JOIN fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style INVITE fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style NOTIFY fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style PENDING fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style JOIN fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style DECLINE_INV fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style OPEN fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style GROUP_CHAT fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style GRP_MSG fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style BROADCAST fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style GRP_CALL fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style GRP_IN_CALL fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style GRP_END fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style MEMBERS fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
    style LEAVE_GRP fill:#5b9aa9,stroke:#4a8292,color:#fff,stroke-width:2px
```

---

## 🎨 Color Legend

| Color | Shape | Meaning |
|---|---|---|
| 🩷 **Pink** `#d4a5b5` | Rounded rectangle | Start / End / Entry points |
| 🟠 **Peach** `#e8c4a0` | Diamond | Decision points (Yes / No) |
| 🔵 **Teal** `#5b9aa9` | Rectangle | Process / Action steps |
| 🔴 **Coral** `#e07a5f` | Rectangle | Error / Failure states |
