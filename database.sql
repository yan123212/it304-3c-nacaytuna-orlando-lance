-- EntabladoTanaw rehearsal scheduler schema and starter theater groups.
-- Do not add CREATE DATABASE or USE statements; the host selects the database.

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE theater_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_groups (
  user_id INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (user_id, group_id),
  CONSTRAINT fk_user_groups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_groups_group FOREIGN KEY (group_id) REFERENCES theater_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rehearsals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  rehearsal_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(180) NOT NULL,
  group_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rehearsals_group FOREIGN KEY (group_id) REFERENCES theater_groups(id) ON DELETE RESTRICT,
  INDEX idx_rehearsals_date_time (rehearsal_date, start_time, end_time),
  INDEX idx_rehearsals_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mutations lock this single row before checking schedule conflicts, preventing
-- concurrent requests from creating overlapping rehearsals.
CREATE TABLE schedule_mutex (
  id TINYINT PRIMARY KEY
) ENGINE=InnoDB;

INSERT INTO schedule_mutex (id) VALUES (1);

INSERT INTO theater_groups (group_name, description) VALUES
  ('Tanghalang Silangan', 'A welcoming space for performers, makers, and storytellers.'),
  ('Likha Ensemble', 'A collaborative group exploring movement and contemporary theater.');
