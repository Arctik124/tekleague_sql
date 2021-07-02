CREATE TABLE Users
(
 UserID         SERIAL PRIMARY KEY,
 name           varchar(50) NOT NULL,
 lowercase_name varchar(50) NOT NULL,
 email          varchar(50) NOT NULL,
 password       varchar(100) NOT NULL,
 main_char      varchar(50) NULL,
 steam_profile  varchar(100) NULL,
 mmr            integer DEFAULT 1000 NOT NULL,
 description    varchar(1000) NULL,
 won             integer DEFAULT 0 NOT NULL,
 total           integer DEFAULT 0 NOT NULL,
 lost            integer DEFAULT 0 NOT NULL,
 declined        integer DEFAULT 0 NOT NULL,
 declined_streak integer DEFAULT 0 NOT NULL,
 created_at     TIMESTAMP DEFAULT now() NOT NULL
);


CREATE TABLE Battle
(
 BattleID          SERIAL PRIMARY KEY,
 player1           integer NOT NULL,
 player2           integer NOT NULL,
 max_score         integer NOT NULL,
 score1            integer DEFAULT 0 NOT NULL,
 score2            integer DEFAULT 0 NOT NULL,
 delta             integer NULL,
 active            boolean DEFAULT true NOT NULL,
 winner            integer NULL,
 accepted          boolean DEFAULT false NOT NULL,
 player_to_confirm integer NULL,
 score_confirmed   boolean DEFAULT false NOT NULL,
 confirmation_sent boolean DEFAULT false NOT NULL,
 created_at        TIMESTAMP DEFAULT now() NOT NULL,
 CONSTRAINT FK_151 FOREIGN KEY ( player1 ) REFERENCES Users ( UserID ),
 CONSTRAINT FK_154 FOREIGN KEY ( player2 ) REFERENCES Users ( UserID ),
 CONSTRAINT FK_162 FOREIGN KEY ( winner ) REFERENCES Users ( UserID ),
 CONSTRAINT FK_166 FOREIGN KEY ( player_to_confirm ) REFERENCES Users ( UserID )
);

CREATE INDEX fkIdx_152 ON Battle
(
 player1
);

CREATE INDEX fkIdx_155 ON Battle
(
 player2
);

CREATE INDEX fkIdx_163 ON Battle
(
 winner
);

CREATE INDEX fkIdx_167 ON Battle
(
 player_to_confirm
);







